// src/three/rectPlacerThree.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RectDefinition, toRenderPos } from "../domain/rect";

export class RectPlacerThree {
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(45, 16/9, 0.1, 1000);
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private rafId: number | null = null;
    private stlMesh: THREE.Mesh | null = null;

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
                this.axes = null;
            }
        }
    }

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
        container.appendChild(this.renderer.domElement);
        this.start();
    }

    resize(width: number, height: number) {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    setRects(rects: RectDefinition[]) {
        this.clearRectMeshes();

        for (const r of rects) {
        const geom = new THREE.BoxGeometry(r.size.lx, r.size.lz, r.size.ly);
        const mat = r.highlighted ? this.highlightMaterial : this.rectMaterial;
        const mesh = new THREE.Mesh(geom, mat);

        const p = toRenderPos(r.pos);
        mesh.position.set(p.x, p.y, p.z);

        this.scene.add(mesh);
        this.rectMeshes.push(mesh);
        }
    }

    async loadStl(file: File): Promise<void> {
        const buf = await file.arrayBuffer();
        this.disposeStlMesh();

        const loader = new STLLoader();
        const geom = loader.parse(buf);
        const mat = new THREE.MeshPhongMaterial({ color: 0xff5555, specular: 0x111111, shininess: 200 });
        this.stlMesh = new THREE.Mesh(geom, mat);
        this.stlMesh.rotateX(-Math.PI / 2);
        this.scene.add(this.stlMesh);
    }

    dispose() {
        this.stop();

        this.clearRectMeshes();
        this.disposeStlMesh();

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
                (tex) => onLoad(tex),
                undefined,
                (err) => {
                console.warn(`[texture] failed to load: ${url}`, err);
                onError?.(err);
                }
            );
        };

        // Ground
        const groundGeometry = new THREE.BoxGeometry(5000, 0.1, 5000);
        const groundMaterial = new THREE.MeshLambertMaterial({color: 0xc2c2c2});
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.y = -2;
        this.scene.add(ground);

        loadTexture(
        `${import.meta.env.BASE_URL}/textures/PavingStones128/PavingStones128_1K-JPG_Color.jpg`,
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(2500, 2500);
            (ground.material as THREE.MeshLambertMaterial).map = tex;
            (ground.material as THREE.MeshLambertMaterial).color = new THREE.Color(0xffffff);
            (ground.material as THREE.MeshLambertMaterial).needsUpdate = true;
        }
        );

        // Sky
        const skyGeometry = new THREE.BoxGeometry(5000, 0.1, 5000);
        const skyMaterial = new THREE.MeshBasicMaterial({color: 0xaecbe8});
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.position.y = 15.0;
        // sky.rotation.z += -0.016;
        this.scene.add(sky);

        loadTexture(
        `${import.meta.env.BASE_URL}/textures/skytile1.png`,
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(25, 25);
            (sky.material as THREE.MeshBasicMaterial).map = tex;
            (sky.material as THREE.MeshBasicMaterial).color = new THREE.Color(0xffffff);
            (sky.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        );

        // Far walls
        const wallSNGeometry = new THREE.BoxGeometry(4000, 100, 1);
        const wallMaterial = new THREE.MeshBasicMaterial({color: 0xaecbe8});
        const wallS = new THREE.Mesh(wallSNGeometry, wallMaterial);
        wallS.position.z = -600;
        // wall.position.z = 0;
        this.scene.add(wallS);

        loadTexture(
        `${import.meta.env.BASE_URL}/textures/skytile1.png`,
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(20, 1);
            (wallS.material as THREE.MeshBasicMaterial).map = tex;
            (wallS.material as THREE.MeshBasicMaterial).color = new THREE.Color(0xffffff);
            (wallS.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        );

        const wallN = new THREE.Mesh(wallSNGeometry, wallMaterial);
        wallN.position.z = 600;
        // wall.position.z = 0;
        this.scene.add(wallN);

        const wallWEGeometry = new THREE.BoxGeometry(1, 100, 4000);
        const wallW = new THREE.Mesh(wallWEGeometry, wallMaterial);
        wallW.position.x = -600;
        // wall.position.z = 0;
        this.scene.add(wallW);

        const wallE = new THREE.Mesh(wallWEGeometry, wallMaterial);
        wallE.position.x = 600;
        // wall.position.z = 0;
        this.scene.add(wallE);

        // Axes
        this.showAxes = this.showAxesFlag;
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
        for (const m of this.rectMeshes) {
        this.scene.remove(m);
        m.geometry.dispose(); // materialは共有なのでdisposeしない
        }
        this.rectMeshes.length = 0;
    }

    private disposeStlMesh() {
        if (!this.stlMesh) return;
        this.scene.remove(this.stlMesh);
        this.stlMesh.geometry.dispose();
        const mat = this.stlMesh.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
        this.stlMesh = null;
    }
}
