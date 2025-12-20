// src/App.vue
<template>
	<div v-cloak>
		<section class="hero">
			<div class="hero-body">
<div class="field is-grouped is-pulled-right">
  <p class="control">
    <a
      class="button is-small is-ghost"
      href="docs/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Docs
    </a>
  </p>

  <p class="control">
    <span class="select is-small">
      <select id="selectLocale" v-model="selectedLocale" @change="switchLocale">
        <option disabled value="">Language</option>
        <option value="en">English</option>
        <option value="ja">Japanese / 日本語</option>
      </select>
    </span>
  </p>
</div>
				<h1 class="title">
				{{ $t("message.rectplacertitle") }}
				</h1>
				<p class="subtitle">
					{{ $t("message.rectplacerdesc") }}
				</p>
			</div>
		</section>
		<section class="section">
			<div class="container" id="canvas"></div>
		<div class="container">
			<div class="box" id="controllerBox">
				<div class="columns">
					<div class="column">
						<label class="label">{{ $t("message.rectInfo") }} (lx,ly,lz,x,y,z)</label>
						<div class="control has-icons-right">
							<textarea class="textarea" id="rectInfo" v-model="rectInfo" @input="rectInfoChanged"></textarea>
						</div>		
						<label>{{ $t("message.howtohighlight") }}</label>
					</div>
					<div class="column">
						<div class="file">
							<label class="file-label">
								<input class="file-input" type="file" @change="onSTLUploaded" />
								<span class="file-cta">
								<span class="file-icon">
									<i class="fas fa-upload"></i>
								</span>
								<span class="file-label">{{ $t("message.selectSTLFile") }}</span>
								</span>
							</label>
							</div>
						<div class="control">
							<label class="checkbox"><input type="checkbox" v-model="showAxes" @change="toggleAxes">{{ $t("message.showAxes") }}</label>
						</div>			
						<div class="field is-grouped">
							<div class="control">
								<button class="button is-primary" @click="takeScreenShot"><i class="fas fa-camera"></i>{{ $t("message.screenshot") }}</button>
							</div>
							<div class="control">
								<button class="button is-primary" @click="saveRects"><i class="fas fa-file-csv"></i>{{ $t("message.saveRects") }}</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		</section>
	</div>
	<section class="section">
		<p>
  Source:
  <a href="https://github.com/akonno/rectplacer" target="_blank" rel="noopener noreferrer">RectPlacer</a>
  on <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
  &middot;
  <a href="https://akonno.github.io/RectPlacer/docs/" target="_blank" rel="noopener noreferrer">Docs</a>
</p>
		<p>Textures for the floor by <a href="https://ambientcg.com/" target="_blank">Lennart Demes at ambientCG</a></p>
	</section>
	<footer class="footer">
		<div class="content has-text-centered">
			<p>
			<a href="https://github.com/akonno/rectplacer"><strong>RectPlacer</strong></a> by KONNO Akihisa
			</p>
		</div>
	</footer>
</template>

<style scoped>
	[v-cloak] {
		display: none;
	}
</style>

<script setup lang="ts">
	// RectPlacer - place rectangular prisms onto the scene
// Copyright (C) 2024 KONNO Akihisa <konno@researchers.jp>

/*
MIT License

Copyright (c) 2024 KONNO Akihisa <konno@researchers.jp>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { parseRectInfo } from "./domain/rectParser";
import { RectPlacerThree } from "./three/rectPlacerThree";
import { parse } from 'node:path';

const containerRef = ref<HTMLElement | null>(null);

const { t, locale } = useI18n();

const rectInfo = ref("0.1,0.1,0.3,0.2,0,0.2");
const selectedLocale = ref('');
const showAxes = ref(true);
const errorOccured = ref(false);
const errorMessage = ref('');
const numRects = ref(0);

let three: RectPlacerThree | null = null;

// setup Vue app
function rectInfoChanged()
{
	parseRectInfo(rectInfo.value);
}
function takeScreenShot()
{
	// https://jsfiddle.net/n853mhwo/
	var a = document.createElement('a');
	// Without 'preserveDrawingBuffer' set to true, we must render now
	renderer.render(scene, camera);
	a.href = renderer.domElement.toDataURL().replace("image/png", "image/octet-stream");
	a.download = 'screenshot.png';
	a.click();
}
function saveRects()
{
	// https://jsfiddle.net/n853mhwo/
	const a = document.createElement('a');
	const textBlob = new Blob([rectInfo.value], {type:'text/csv'});
	a.href = window.URL.createObjectURL(textBlob);
	a.download = 'rects.csv';
	a.click();
}
function onSTLUploaded(e)
{
	// event(=e)から画像データを取得する
	const stlFile = e.target.files[0]
	console.log(stlFile.name);
	loadSTLFromFile(stlFile)
}
function switchLocale()
{
	locale.value = selectedLocale.value;
	// console.log('locale is changed to ', this.$i18n.locale);
}
function toggleAxes()
{
	showAxes.value = !showAxes.value;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

onMounted(() => {
  // Initialize Three.js renderer
  if (!containerRef.value) {
    return;
  }
  three = new RectPlacerThree();
  three.mount(containerRef.value);

  const { rects, errors } = parseRectInfo(rectInfo.value);
  if (errors.length > 0) {
    errorMessage.value = errors.map(e => `Line ${e.line}: ${e.message}`).join("\n");
    errorOccured.value = true;
  } else {
    three.setRects(rects);
  }

	const width = document.getElementById("canvas")!.scrollWidth;
	renderer.setSize(width, width / 16 * 9);
	document.getElementById("canvas")!.appendChild(renderer.domElement);

	onResize();
	window.addEventListener('resize', onResize);
	// Start visualization
	// This should be after initializing app, because animate() uses app.playMode.
	if (isWebGLAvailable()) {
		parseRectInfo(rectInfo.value);
		animate();
	} else {
		errorMessage.value = "WebGL is not available on this browser/environment.";
		errorOccured.value = true;
	}
});

// RectPlacer visualization
// scene, camera and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, 16./9.,
    0.1, 1000
);
const renderer = new THREE.WebGLRenderer({antialias: true});

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
// const controls = new FlyControls(camera, renderer.domElement);


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

// Place elements on the scene.
// Light
const light1 = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(light1);
const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.x = 10;
light2.position.y = 4;
light2.position.z = 10;
scene.add(light2);

// Texture handling
function loadTexture(
  url: string,
  onLoad: (tex: THREE.Texture) => void,
  onError?: (err: unknown) => void
) {
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
}

// Ground
const groundGeometry = new THREE.BoxGeometry(5000, 0.1, 5000);
const groundMaterial = new THREE.MeshLambertMaterial({color: 0xc2c2c2});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -2;
scene.add(ground);

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
scene.add(sky);

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
scene.add(wallS);

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
scene.add(wallN);

const wallWEGeometry = new THREE.BoxGeometry(1, 100, 4000);
const wallW = new THREE.Mesh(wallWEGeometry, wallMaterial);
wallW.position.x = -600;
// wall.position.z = 0;
scene.add(wallW);

const wallE = new THREE.Mesh(wallWEGeometry, wallMaterial);
wallE.position.x = 600;
// wall.position.z = 0;
scene.add(wallE);

// Camera position
// normal
camera.position.x = -1;
camera.position.y = 1;
camera.position.z = 0.5;
// close view
// camera.position.z = 4;
// camera.position.y = 3;
// camera.rotation.x = -0.5;

// Axes
// XXX: Axes are rotated! Beware!
const axes = new THREE.AxesHelper(25);
axes.rotateX(-Math.PI/2);
scene.add(axes);

function renderAxes()
{
    scene.remove(axes);
    scene.add(axes);
}

function hideAxes()
{
    scene.remove(axes);
}

// Load STL
let stlMesh: THREE.Mesh | null = null;

function loadSTLFromFile(aFile)
{
    // https://stackoverflow.com/questions/54091926/how-to-upload-stl-files-in-html-using-threejs
    const reader = new FileReader();
    reader.onload = function (e) {
      disposeStlMesh();

        const loader = new STLLoader();
        const geometry = loader.parse(e.target.result as ArrayBuffer);
        const material = new THREE.MeshPhongMaterial({ color: 0xff5555, specular: 0x111111, shininess: 200 });
        stlMesh = new THREE.Mesh(geometry, material);
        stlMesh.rotateX(-Math.PI/2);
        scene.add(stlMesh);
    };
    reader.readAsArrayBuffer(aFile);
    // animate();
}

function disposeStlMesh()
{
    if (stlMesh) {
        scene.remove(stlMesh);
        stlMesh.geometry.dispose();
        if (Array.isArray(stlMesh.material)) {
            for (const mat of stlMesh.material) {
                mat.dispose();
            }
        } else {
            stlMesh.material.dispose();
        }
        stlMesh = null;
    }
}

// For rectangular prisms
// Create material with transparency
const rectMaterial = new THREE.MeshPhongMaterial({
    color: 0x0000ff,     // Blue color
    transparent: true,
    opacity: 0.5         // Semi-transparent
});

const highlightMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ff00,     // Green color
    transparent: true,
    opacity: 0.5         // Semi-transparent
});

let rectMeshes = [];
function clearRectMeshes() {
  for (const m of rectMeshes) {
    scene.remove(m);
    // materialは共有なのでdisposeしない（rectMaterial/highlightMaterial）
    m.geometry.dispose();
  }
  rectMeshes.length = 0;
}

let rafId: number | null = null;

function animate() {
    rafId = requestAnimationFrame(animate);

    renderer.render(scene, camera);

    controls.update();
}

function onResize()
{
  const el = document.getElementById("controllerBox");
  if (!el) {
    return;
  }
    const width = el.scrollWidth;
    const height = width / 16 * 9;

    // レンダラーのサイズを調整する
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

  // カメラのアスペクト比を正す
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('resize', onResize);
  
  // Rectは個別geometryをdispose（materialは共有なのでdisposeしない）
  clearRectMeshes();

  // STL meshも後述の変数でdisposeする（P0-4）
  disposeStlMesh();

  controls.dispose();
  renderer.dispose();
});
</script>
