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

  // 共有material（disposeしない）
  private rectMaterial = new THREE.MeshPhongMaterial({ /* ここは既存値を移植 */ });
  private highlightMaterial = new THREE.MeshPhongMaterial({ /* ここは既存値を移植 */ });

  private rectMeshes: THREE.Mesh[] = [];

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.initScene();
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
      const geom = new THREE.BoxGeometry(r.size.lx, r.size.ly, r.size.lz);
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

  // ---- private ----

  private initScene() {
    // ここに lights, axes, camera初期位置など、今App.vueにある初期化を移植
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
