// src/three/rectPlacerThree.ts
// Last Modified: 2025/12/21 23:16:41
// Copyright (C) 2024-2025 KONNO Akihisa <konno@researchers.jp>

// Three.js based implementation of RectPlacer
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RectDefinition, toRenderPos } from "../domain/rect";
import { isValidStlScale } from "./stlScale";
import { disposeStlMeshResources } from "./disposeStlMeshResources";
import { computeCameraLimits } from "./cameraLimits";

// Import texture URLs
import skyTextureUrl from "/assets/textures/skytile1.png";
import groundTextureUrl from "/assets/textures/PavingStones128/PavingStones128_1K-JPG_Color.jpg";

// Track disposable resources
type Disposable = { dispose: () => void };

class ResourceTracker {
  private resources = new Set<Disposable>();

  track<T extends Disposable>(res: T): T {
    this.resources.add(res);
    return res;
  }

  // Material は配列の場合があるのでヘルパ
  trackMaterial(mat: THREE.Material | THREE.Material[]) {
    if (Array.isArray(mat)) mat.forEach((m) => this.track(m));
    else this.track(mat);
  }

  disposeAll() {
    for (const res of this.resources) res.dispose();
    this.resources.clear();
  }
}

const normalRectColor = new THREE.Color(0x0000ff); // Blue
const highlightedRectColor = new THREE.Color(0x00ff00); // Green
const workingRectColor = new THREE.Color(0x007744); // Dark Green

// Camera clip planes wide enough to always include the fixed scene
// backdrop (ground/sky/walls out to wallDistance=600 in initScene), on
// top of whatever an STL's own size additionally requires.
const DEFAULT_CAMERA_NEAR = 0.1;
const DEFAULT_CAMERA_FAR = 1000;

// XXX: Coordinates of Three.js:
// y ^
//   |
//   |
//   +--------> x
//  /
// /z
// z: from the back of the screen towards the front
//
// Coordinetes in this program:
// z ^  y
//   | /
//   |/
//   +--------> x
// y: from the front of the screen towards the back

export class RectPlacerThree {
    private alive = true;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(45, 16/9, DEFAULT_CAMERA_NEAR, DEFAULT_CAMERA_FAR);
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private skyTexturePromise: Promise<THREE.Texture> | null = null;

    private rafId: number | null = null;
    private stlMesh: THREE.Mesh | null = null;
    private stlScale: number = 1.0;
    // Monotonically increasing token identifying the most recent loadStl()
    // call; used to discard a stale load that resolves after a newer one.
    private stlLoadGeneration = 0;

    // ---- InstancedMesh (Rect) ----
    private rectInst: THREE.InstancedMesh | null = null;
    private maxRects = 200000;

    // Axes helper
    private axes: THREE.AxesHelper | null = null;
    private showAxesFlag: boolean = true;
    private axesLength: number = 25;
    get showAxes(): boolean {
        return this.showAxesFlag;
    }
    set showAxes(v: boolean) {
        this.showAxesFlag = v;
        if (v) {
            if (!this.axes) {
                this.axes = new THREE.AxesHelper(this.axesLength);
                this.axes.rotateX(-Math.PI / 2);
                this.scene.add(this.axes);
            }
        } else {
            if (this.axes) {
                this.scene.remove(this.axes);
                // AxesHelper is toggled on/off during runtime, so we dispose it manually (not tracked).
                this.axes.geometry.dispose();
                // AxesHelper.material は LineBasicMaterial または配列の場合がある
                const mat = this.axes.material;
                if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                else mat.dispose();
                this.axes = null;
            }
        }
    }

    private res = new ResourceTracker();

    // 共有material（disposeしない）
    private rectMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,     // White color
        transparent: true,
        opacity: 0.5         // Semi-transparent
        // vertexColors: false, // doesn't work with InstancedMesh
    });

    private rectMeshes: THREE.Mesh[] = [];

    constructor() {
        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.initScene();
        } catch (e) {
            throw new Error("Failed to initialize WebGL renderer. " + (e as Error).message);
        }
    }

    mount(container: HTMLElement) {
        if (this.renderer.domElement.parentElement !== container) {
            container.appendChild(this.renderer.domElement);
        }
        this.start();
    }

    resize(width: number, height: number) {
        if (!this.alive) return;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    setRects(rects: RectDefinition[]) {
        if (!this.rectInst) {
            console.warn("InstancedMesh for rects is not initialized.");
            return;
        }

        let nRect = 0;

        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion(); // 回転なし
        const pos = new THREE.Vector3();
        const scl = new THREE.Vector3();

        for (const r of rects) {
            // BoxGeometryは(1,1,1)基準で作ってあるので、scaleでサイズを表す
            // あなたの既存コードは BoxGeometry(lx,lz,ly) だったので、それに合わせて scale を組む
            scl.set(r.size.lx, r.size.lz, r.size.ly);

            const p = toRenderPos(r.pos);
            pos.set(p.x, p.y, p.z);

            m.compose(pos, q, scl);

            this.rectInst.setMatrixAt(nRect, m);
            const rColor = r.status === 'highlighted' ? highlightedRectColor :
                           r.status === 'working' ? workingRectColor :
                           normalRectColor;
            this.rectInst.setColorAt(nRect, rColor);
            nRect++;
        }

        this.rectInst.count = nRect;
        this.rectInst.instanceMatrix.needsUpdate = true;
        if (this.rectInst.instanceColor) {
            this.rectInst.instanceColor.needsUpdate = true;
        }
    }

    async loadStl(file: File): Promise<void> {
        const generation = ++this.stlLoadGeneration;
        const buf = await file.arrayBuffer();
        if (!this.alive || generation !== this.stlLoadGeneration) {
            // Disposed, or superseded by a newer STL selection made while
            // this one was still being read -- leave the scene and
            // whatever mesh a later (or no) call has set up untouched.
            return;
        }

        this.disposeStlMesh();

        // Not tracked by ResourceTracker: the STL mesh's geometry/material
        // are short-lived and swapped out on every load, so disposeStlMesh()
        // is their single, sole owner (see disposeStlMeshResources()).
        // ResourceTracker is reserved for resources that live for the
        // scene's lifetime and are only released on app dispose().
        const loader = new STLLoader();
        const geom = loader.parse(buf);
        const mat = new THREE.MeshPhongMaterial({ color: 0xff5555, specular: 0x111111, shininess: 200 });
        this.stlMesh = new THREE.Mesh(geom, mat);
        this.stlMesh.rotateX(-Math.PI / 2);
        // Apply the current display scale so a re-loaded/newly-loaded STL
        // matches the scale already shown in the UI, rather than
        // resetting to 1.
        this.stlMesh.scale.set(this.stlScale, this.stlScale, this.stlScale);
        this.scene.add(this.stlMesh);
        this.frameObject(this.stlMesh);
    }

    setStlScale(scale: number) {
        if (!isValidStlScale(scale)) {
            console.warn(`Ignoring invalid STL scale: ${scale}`);
            return;
        }
        this.stlScale = scale;
        if (this.stlMesh) {
            this.stlMesh.scale.set(scale, scale, scale);
            // Re-frame: the model's size just changed, so the camera
            // distance computed for the old scale no longer applies.
            this.frameObject(this.stlMesh);
        }
    }

    dispose() {
        this.alive = false;
        this.stop();

        this.clearRectMeshes();
        this.disposeStlMesh();

        this.res.disposeAll();
        this.controls.dispose();
        this.renderer.dispose();

        // 共有materialはここで破棄してよい（サービス寿命＝アプリ寿命なら）
        this.rectMaterial.dispose();
    }

    public async takeScreenshot(filename = "screenshot.png"): Promise<void> {
        // preserveDrawingBuffer が false の場合に備えて、直前に描画しておく
        this.renderer.render(this.scene, this.camera);

        const canvas = this.renderer.domElement;

        // 可能なら toBlob が良い（大きい画像でメモリ節約）
        await new Promise<void>((resolve) => {
            canvas.toBlob((blob) => {
            if (!blob) {
                // フォールバック（古い環境用）
                const a = document.createElement("a");
                a.href = canvas
                .toDataURL("image/png")
                .replace("image/png", "image/octet-stream");
                a.download = filename;
                a.click();
                resolve();
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();

            // クリック後に解放
            setTimeout(() => URL.revokeObjectURL(url), 0);
            resolve();
            }, "image/png");
        });
    }


    // ---- private ----

    // Moves the camera back (keeping its current viewing direction) so
    // `object`'s bounding sphere fits within the vertical field of view.
    // Without this, an STL loaded at a real-world scale far from the
    // scene's default ~1-2 unit camera distance (e.g. meters vs the
    // default sample rects' ~0.1-0.5 units) starts up nearly inside the
    // model instead of framing it.
    private frameObject(object: THREE.Object3D, paddingFactor = 1.5) {
        object.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(object);
        if (box.isEmpty()) {
            return;
        }

        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        // An extreme (but finite) STL scale can overflow the bounding
        // sphere's center/radius to Infinity/NaN. Validate everything
        // before touching camera state, and bail out (leaving the
        // existing, presumably-valid camera state alone) rather than
        // writing non-finite values into it.
        if (
            !(sphere.radius > 0) ||
            !Number.isFinite(sphere.radius) ||
            !Number.isFinite(sphere.center.x) ||
            !Number.isFinite(sphere.center.y) ||
            !Number.isFinite(sphere.center.z)
        ) {
            return;
        }

        // camera.fov is the *vertical* FOV; derive the horizontal one from
        // the aspect ratio so narrow/portrait viewports (aspect < 1, where
        // horizontal FOV is the tighter of the two) don't clip the sphere
        // on the sides.
        const vFovHalfRad = THREE.MathUtils.degToRad(this.camera.fov) / 2;
        const aspect = this.camera.aspect;
        // A hidden/collapsed container can report width 0 (aspect 0), which
        // would otherwise make hFovHalfRad 0 and distance infinite,
        // corrupting the camera's position/near/far. Fall back to the
        // (always valid) vertical FOV in that case.
        const hFovHalfRad = Number.isFinite(aspect) && aspect > 0
            ? Math.atan(Math.tan(vFovHalfRad) * aspect)
            : vFovHalfRad;
        const limitingFovHalfRad = Math.min(vFovHalfRad, hFovHalfRad);
        const distance = (sphere.radius / Math.sin(limitingFovHalfRad)) * paddingFactor;
        if (!Number.isFinite(distance) || distance <= 0) {
            return;
        }

        const viewDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        if (viewDir.lengthSq() === 0) {
            viewDir.set(-1, 1, 0.5);
        }
        viewDir.normalize();

        const newPosition = new THREE.Vector3().copy(sphere.center).addScaledVector(viewDir, distance);
        // Never shrink the far plane below the default: the ground/sky/
        // walls built in initScene() sit out at a fixed distance (up to
        // wallDistance=600) regardless of the loaded STL's size, and a
        // smaller far plane here would clip them out of view.
        const { near: newNear, far: newFar, minDistance: newMinDistance, maxDistance: newMaxDistance } =
            computeCameraLimits(sphere.radius, distance, DEFAULT_CAMERA_FAR);

        if (
            !Number.isFinite(newPosition.x) ||
            !Number.isFinite(newPosition.y) ||
            !Number.isFinite(newPosition.z) ||
            !Number.isFinite(newNear) ||
            !Number.isFinite(newFar) ||
            !Number.isFinite(newMinDistance) ||
            !Number.isFinite(newMaxDistance) ||
            !(newNear > 0) ||
            !(newMinDistance > newNear) ||
            !(newMaxDistance > newMinDistance) ||
            !(newFar > newMaxDistance)
        ) {
            return;
        }

        this.camera.position.copy(newPosition);
        this.camera.near = newNear;
        this.camera.far = newFar;
        this.camera.updateProjectionMatrix();

        this.controls.target.copy(sphere.center);
        // Bound OrbitControls' mouse-wheel zoom (dolly) to this object's
        // scale: without limits, zooming in has no minimum distance and
        // can push the camera past the near plane (clipping the model),
        // and zooming out has no maximum, risking the far plane instead.
        this.controls.minDistance = newMinDistance;
        this.controls.maxDistance = newMaxDistance;
        this.controls.update();
    }

    private loadSkyTexture(): Promise<THREE.Texture> {
        if (this.skyTexturePromise) {
            return this.skyTexturePromise;
        }

        this.skyTexturePromise = new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                skyTextureUrl,
                (tex) => {
                    if (!this.alive) {
                        tex.dispose();
                        reject(new Error("RectPlacerThree is already disposed."));
                        return;
                    }
                    this.res.track(tex);
                    resolve(tex);
                },
                undefined,
                (err) => {
                    console.warn("[sky] texture load failed", err);
                    reject(err);
                }
            );
        });

        return this.skyTexturePromise;
    }

    private initScene() {
        // ここに lights, axes, camera初期位置など、今App.vueにある初期化を移植

        // Place elements on the scene.
        // Light
        const light1 = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(light1);
        const light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.x = 10;
        light2.position.y = 4;
        light2.position.z = 10;
        this.scene.add(light2);

        // Background
        this.scene.background = new THREE.Color(0xcce0ff);

        // Camera position
        // normal
        this.camera.position.x = -1;
        this.camera.position.y = 1;
        this.camera.position.z = 0.5;
        // close view
        // camera.position.z = 4;
        // camera.position.y = 3;
        // camera.rotation.x = -0.5;

        // Texture handling
        const loadTexture = (
            url: string,
            onLoad: (tex: THREE.Texture) => void,
            onError?: (err: unknown) => void
        ) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (tex) => {
                    if (!this.alive) {
                        tex.dispose();
                        return;
                    }
                    onLoad(tex);
                },
                undefined,
                (err) => {
                console.warn(`[texture] failed to load: ${url}`, err);
                onError?.(err);
                }
            );
        };

        // Ground
        const groundGeometry = this.res.track(new THREE.PlaneGeometry(5000, 5000));
        const groundMaterial = this.res.track(new THREE.MeshLambertMaterial({color: 0xc2c2c2}));
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotateX(-Math.PI / 2);
        ground.position.y = -2;
        this.scene.add(ground);

        loadTexture(
            groundTextureUrl,
            (tex) => {
                this.res.track(tex);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(2500, 2500);
                (ground.material as THREE.MeshLambertMaterial).map = tex;
                (ground.material as THREE.MeshLambertMaterial).color = new THREE.Color(0xffffff);
                (ground.material as THREE.MeshLambertMaterial).needsUpdate = true;
            }
        );

        // Sky
        const skyGeometry = this.res.track(new THREE.PlaneGeometry(5000, 5000));
        const skyMaterial = this.res.track(new THREE.MeshBasicMaterial({color: 0xaecbe8}));
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.rotation.x += Math.PI / 2;
        sky.position.y = 15.0;
        this.scene.add(sky);

        this.loadSkyTexture().then(
            (tex) => {
                if (!this.alive) {
                    return;
                }
                const skyTex = tex.clone();
                this.res.track(skyTex);
                skyTex.wrapS = THREE.RepeatWrapping;
                skyTex.wrapT = THREE.RepeatWrapping;
                skyTex.repeat.set(25, 25);
                (sky.material as THREE.MeshBasicMaterial).map = skyTex;
                (sky.material as THREE.MeshBasicMaterial).color = new THREE.Color(0xffffff);
                (sky.material as THREE.MeshBasicMaterial).needsUpdate = true;
            }
        )
        .catch((err) => {
            console.warn("Sky texture load failed:", err);
        });

        // Far walls (no thickness)
        const wallHeight = 100;
        const wallSpan = 4000;
        const wallDistance = 600;

        // 先に壁を作ってsceneに追加（materialのmapは後で入れる）
        type WallSpec = {
            name: string;
            width: number;
            height: number;
            pos: THREE.Vector3;
            rotY: number;
            repeat: { x: number; y: number };
        };

        const wallSpecs: WallSpec[] = [
        // South / North : X方向に長い壁、Zに配置
        {
            name: "S",
            width: wallSpan,
            height: wallHeight,
            pos: new THREE.Vector3(0, wallHeight / 2, -wallDistance),
            rotY: 0,
            repeat: { x: 20, y: 1 },
        },
        {
            name: "N",
            width: wallSpan,
            height: wallHeight,
            pos: new THREE.Vector3(0, wallHeight / 2, wallDistance),
            rotY: Math.PI, // 反対向き
            repeat: { x: 20, y: 1 },
        },

        // West / East : Z方向に長い壁、Xに配置（Y回転90度）
        {
            name: "W",
            width: wallSpan,
            height: wallHeight,
            pos: new THREE.Vector3(-wallDistance, wallHeight / 2, 0),
            rotY: Math.PI / 2,
            repeat: { x: 20, y: 1 },
        },
        {
            name: "E",
            width: wallSpan,
            height: wallHeight,
            pos: new THREE.Vector3(wallDistance, wallHeight / 2, 0),
            rotY: -Math.PI / 2,
            repeat: { x: 20, y: 1 },
        },
        ];

        const walls: THREE.Mesh[] = [];

        for (const spec of wallSpecs) {
        const geom = this.res.track(new THREE.PlaneGeometry(spec.width, spec.height));
        const mat = this.res.track(new THREE.MeshBasicMaterial({
            color: 0xaecbe8,
            side: THREE.DoubleSide, // 内側からも見えるように
        }));
        const wall = new THREE.Mesh(geom, mat);

        wall.position.copy(spec.pos);
        wall.rotation.y = spec.rotY;

        this.scene.add(wall);
        walls.push(wall);
        }

        // テクスチャは1回ロードして、全壁に適用する
        this.loadSkyTexture().then(
            (tex) => {
                if (!this.alive) {
                    return;
                }
                const skyTex = tex.clone();
                this.res.track(skyTex);
                skyTex.wrapS = THREE.RepeatWrapping;
                skyTex.wrapT = THREE.RepeatWrapping;
                skyTex.repeat.set(20, 1);

                // ★同じTextureを共有しつつ、repeatだけ変えたい場合は壁ごとに clone が必要
                // 今回は全壁同じrepeatで良ければ「共有」でOK
                for (const wall of walls) {
                    const mat = wall.material as THREE.MeshBasicMaterial;
                    mat.map = skyTex;
                    mat.color = new THREE.Color(0xffffff);
                    mat.needsUpdate = true;
                }
            }
        )
        .catch((err) => {
            console.warn("Wall texture load failed:", err);
        });

        // Axes
        this.showAxes = this.showAxesFlag;

        // Controls
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // ---- Rect InstancedMesh (P2 preparation) ----

        // 単位箱ジオメトリ（サイズは instance の scale で表現する）
        const rectGeom = this.res.track(new THREE.BoxGeometry(1, 1, 1));

        // 初期確保数（まずは控えめでOK。必要になったら拡張する）
        const initialCapacity = 1000;

        // 通常Rect用 InstancedMesh
        this.rectInst = new THREE.InstancedMesh(
            rectGeom,
            this.rectMaterial,
            this.maxRects
        );
        this.rectInst.count = 0;
        this.rectInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (this.rectInst.instanceColor) {
            this.rectInst.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        this.rectInst.frustumCulled = false;
        this.scene.add(this.rectInst);
    }

    private start() {
        if (this.rafId !== null) return;
        const loop = () => {
        this.rafId = requestAnimationFrame(loop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        };
        loop();
    }

    private stop() {
        if (this.rafId === null) return;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    private clearRectMeshes() {
        if (this.rectInst) {
            this.rectInst.count = 0;
            this.rectInst.instanceMatrix.needsUpdate = true;
        }
    }

    private disposeStlMesh() {
        if (!this.stlMesh) return;
        this.scene.remove(this.stlMesh);
        disposeStlMeshResources(this.stlMesh);
        this.stlMesh = null;
    }
}
