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
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

// Vue I18n
const messages = {
    en: {
        message: {
            rectplacertitle: 'RectPlacer',
            rectplacerdesc: 'Place rectangular parallelpiped on a 3-D model',
            controller: 'Rect Placer',
            rectInfo: 'Size and Position of Rects',
            howtohighlight: 'Put "*" at the start of the line to highlight the prism',
            screenshot: 'Take screenshot',
            saveRects: 'Save data as CSV',
            selectSTLFile: 'Upload STL file',
            showAxes: 'Show Axes'
        },
    },
    ja: {
        message: {
            rectplacertitle: 'RectPlacer - 直方体を置く',
            rectplacerdesc: '3Dモデル上に直方体を置きます',
            controller: '矩形配置',
            rectInfo: '矩形寸法と位置',
            howtohighlight: '"*"を先頭につけると矩形が強調されます',
            screenshot: '画像を保存',
            saveRects: '矩形データを保存',
            selectSTLFile: 'STLファイルをアップロード',
            showAxes: '座標軸を表示'
        },
    }
};

const i18n = createI18n({
    locale: navigator.language.split('-')[0],
    fallbackLocale: 'en',
    messages,
});

// setup Vue app
const app = createApp({
    data() {
      return {
        rectInfo: "0.1,0.1,0.3,0.2,0,0.2",
        selectedLocale: '',
        showAxes: true
      };
    },
    methods: {
        rectInfoChanged()
        {
            parseRectInfo(this.rectInfo);
        },  
        takeScreenShot()
        {
            // https://jsfiddle.net/n853mhwo/
            var a = document.createElement('a');
            // Without 'preserveDrawingBuffer' set to true, we must render now
            renderer.render(scene, camera);
            a.href = renderer.domElement.toDataURL().replace("image/png", "image/octet-stream");
            a.download = 'screenshot.png';
            a.click();
        },
        saveRects()
        {
            // https://jsfiddle.net/n853mhwo/
            const a = document.createElement('a');
            const textBlob = new Blob([this.rectInfo], {type:'text/csv'});
            a.href = window.URL.createObjectURL(textBlob);
            a.download = 'rects.csv';
            a.click();
        },
        onSTLUploaded(e)
        {
            // event(=e)から画像データを取得する
            const stlFile = e.target.files[0]
            console.log(stlFile.name);
            loadSTLFromFile(stlFile)
        },
        switchLocale()
        {
            this.$i18n.locale = this.selectedLocale;
            // console.log('locale is changed to ', this.$i18n.locale);
        },
        toggleAxes()
        {
            if (this.showAxes) {
                showAxes();
            } else {
                hideAxes();
            }
        }
    }
  }).use(i18n).mount("#app");

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

const width = document.getElementById("canvas").scrollWidth;
renderer.setSize(width, width / 16 * 9);
document.getElementById("canvas").appendChild(renderer.domElement);

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

// Ground
const groundGeometry = new THREE.BoxGeometry(5000, 0.1, 5000);
const groundTexture = new THREE.TextureLoader().load('public/textures/PavingStones128/PavingStones128_1K-JPG_Color.jpg');
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(2500, 2500);
const groundMaterial = new THREE.MeshLambertMaterial({map: groundTexture});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -2;
scene.add(ground);

// Sky
const skyGeometry = new THREE.BoxGeometry(5000, 0.1, 5000);
const skyTexture = new THREE.TextureLoader().load('public/textures/skytile1.png');
skyTexture.wrapS = THREE.RepeatWrapping;
skyTexture.wrapT = THREE.RepeatWrapping;
skyTexture.repeat.set(25, 25);
const skyMaterial = new THREE.MeshBasicMaterial({map: skyTexture});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.y = 15.0;
// sky.rotation.z += -0.016;
scene.add(sky);

// Far walls
const wallSNGeometry = new THREE.BoxGeometry(4000, 100, 1);
const wallTexture = new THREE.TextureLoader().load('public/textures/skytile1.png');
wallTexture.wrapS = THREE.RepeatWrapping;
wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(20, 1);
const wallMaterial = new THREE.MeshBasicMaterial({map: wallTexture});
const wallS = new THREE.Mesh(wallSNGeometry, wallMaterial);
wallS.position.z = -600;
// wall.position.z = 0;
scene.add(wallS);

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

function showAxes()
{
    scene.remove(axes);
    scene.add(axes);
}

function hideAxes()
{
    scene.remove(axes);
}

// Load STL
function loadSTLFromFile(aFile)
{
    // https://stackoverflow.com/questions/54091926/how-to-upload-stl-files-in-html-using-threejs
    const reader = new FileReader();
    reader.onload = function (e) {
        const loader = new STLLoader();
        const geometry = loader.parse(e.target.result);
        const material = new THREE.MeshPhongMaterial({ color: 0xff5555, specular: 0x111111, shininess: 200 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotateX(-Math.PI/2);
        scene.add(mesh);
    };
    reader.readAsArrayBuffer(aFile);
    // animate();
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

function parseRectInfo(commands) {
    // Parse rectInfo text lines
    // First, remove current rects.
    rectMeshes.forEach((m) => {
        scene.remove(m);
        m.material.dispose();
        m.geometry.dispose();        
    });
    // First parse commands.
    const rectLines = commands.split("\n");
    const re = new RegExp(/^(\*?)([+-]?\d+(\.(\d+)?)?),([+-]?\d+(\.(\d+)?)?),([+-]?\d+(\.(\d+)?)?),([+-]?\d+(\.(\d+)?)?),([+-]?\d+(\.(\d+)?)?),([+-]?\d+(\.(\d+)?)?)$/);
    const rects = [];
    let lineno = 1;
    let errorOccured = false;
    rectLines.forEach((line) => {
        if (line === '') {
            // empty line
            return; // continue
        }
        // console.log(line);
        const m = line.match(re);
        // console.log(m);
        if (m) {
            const lx = parseFloat(m[2]);
            const ly = parseFloat(m[5]);
            const lz = parseFloat(m[8]);
            const x = parseFloat(m[11]);
            const y = parseFloat(m[14]);
            const z = parseFloat(m[17]);
            // console.log(lx, ly, lz, x, y, z);
            rects.push([lx, ly, lz, x, y, z]);
            // x, y, z --> x, z, -y
            const prismGeometry = new THREE.BoxGeometry(lx, lz, ly);  // Width, Height, Depth of the rectangular prism
            let material = rectMaterial;
            if (m[1] !== '') {
                material = highlightMaterial;
            }
            const mesh = new THREE.Mesh(prismGeometry, material);
            scene.add(mesh);
            mesh.position.x = x;
            mesh.position.y = z;
            mesh.position.z = -y;
            rectMeshes.push(mesh);
        } else {
            app.errorMessage = 'error: cannot parse line ' + lineno;
            console.error(app.errorMessage);
            errorOccured = true;
        }
        ++lineno;
    });
    app.numRects = rects.length;

    // console.log(compiledMotions);
    return !errorOccured;
}

function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);

    controls.update();
}

onResize();
window.addEventListener('resize', onResize);

function onResize()
{
    const width = document.getElementById("controllerBox").scrollWidth;
    const height = width / 16 * 9;

    // レンダラーのサイズを調整する
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

  // カメラのアスペクト比を正す
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

// Start visualization
// This should be after initializing app, because animate() uses app.playMode.
if (WebGL.isWebGLAvailable()) {
    parseRectInfo(app.rectInfo);
    animate();
} else {
    app.errorMessage = WebGL.getWebGLErrorMessage();
    app.errorOccured = true;
}
