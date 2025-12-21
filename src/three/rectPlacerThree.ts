// src/three/rectPlacerThree.ts
// Last Modified: 2025/12/21 21:13:04
// Copyright (C) 2024-2025 KONNO Akihisa <konno@researchers.jp>

// Three.js based implementation of RectPlacer
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RectDefinition, toRenderPos } from "../domain/rect";

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
    private camera = new THREE.PerspectiveCamera(45, 16/9, 0.1, 1000);
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private skyTexturePromise: Promise<THREE.Texture> | null = null;

    private rafId: number | null = null;
    private stlMesh: THREE.Mesh | null = null;
    private stlScale: number = 1.0;

    // ---- InstancedMesh (Rect) ----
    private rectInst: THREE.InstancedMesh | null = null;
    private highlightInst: THREE.InstancedMesh | null = null;
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
        color: 0x0000ff,     // Blue color
        transparent: true,
        opacity: 0.5         // Semi-transparent
    });
    private highlightMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,     // Green color
        transparent: true,
        opacity: 0.5         // Semi-transparent
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
        if (!this.rectInst || !this.highlightInst) {
            console.warn("InstancedMesh for rects is not initialized.");
            return;
        }

        let nNormal = 0;
        let nHi = 0;

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

            if (r.highlighted) {
                this.highlightInst.setMatrixAt(nHi, m);
                nHi++;
            } else {
                this.rectInst.setMatrixAt(nNormal, m);
                nNormal++;
            }
        }

        this.rectInst.count = nNormal;
        this.highlightInst.count = nHi;

        this.rectInst.instanceMatrix.needsUpdate = true;
        this.highlightInst.instanceMatrix.needsUpdate = true;
    }

    async loadStl(file: File): Promise<void> {
        const buf = await file.arrayBuffer();
        this.disposeStlMesh();

        const loader = new STLLoader();
        const geom = this.res.track(loader.parse(buf));
        const mat = this.res.track(new THREE.MeshPhongMaterial({ color: 0xff5555, specular: 0x111111, shininess: 200 }));
        this.stlMesh = new THREE.Mesh(geom, mat);
        this.stlMesh.rotateX(-Math.PI / 2);
        this.scene.add(this.stlMesh);
    }

    setStlScale(scale: number) {
        this.stlScale = scale;
        if (this.stlMesh) {
            this.stlMesh.scale.set(scale, scale, scale);
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
        this.highlightMaterial.dispose();
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
        this.rectInst.frustumCulled = false;
        this.scene.add(this.rectInst);

        // ハイライトRect用 InstancedMesh
        this.highlightInst = new THREE.InstancedMesh(
            rectGeom,
            this.highlightMaterial,
            this.maxRects
        );
        this.highlightInst.count = 0;
        this.highlightInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.highlightInst.frustumCulled = false;
        this.scene.add(this.highlightInst);
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
        if (this.highlightInst) {
            this.highlightInst.count = 0;
            this.highlightInst.instanceMatrix.needsUpdate = true;
        }
    }

    private disposeStlMesh() {
        if (!this.stlMesh) return;
        this.scene.remove(this.stlMesh);
        this.stlMesh = null;
    }
}
