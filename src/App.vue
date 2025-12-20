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
			<div class="container" ref="containerRef"></div>
		<div class="container">
			<div class="box" id="controllerBox">
				<div class="columns">
					<div class="column">
						<label class="label">{{ $t("message.rectInfo") }} (lx,ly,lz,x,y,z)</label>
						<div class="control has-icons-right">
							<textarea class="textarea" id="rectInfo" v-model="rectInfo"></textarea>
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
							<label class="checkbox"><input type="checkbox" v-model="showAxes">{{ $t("message.showAxes") }}</label>
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { parseRectInfo } from "./domain/rectParser";
import { RectPlacerThree } from "./three/rectPlacerThree";

const containerRef = ref<HTMLElement | null>(null);

const { t, locale } = useI18n();

const rectInfo = ref("0.1,0.1,0.3,0.2,0,0.2");  // sample data
const selectedLocale = ref('');
const showAxes = ref(true);
const errorOccured = ref(false);
const errorMessage = ref('');
const numRects = ref(0);

let three: RectPlacerThree | null = null;

// setup Vue app
function takeScreenShot()
{
  if (!three) {
    return;
  }
  three.takeScreenshot("screenshot.png");
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

onMounted(() => {
  // Initialize Three.js renderer
  if (!containerRef.value) {
    return;
  }
  try {
      three = new RectPlacerThree();
      three.mount(containerRef.value);
  } catch (e) {
      errorMessage.value = t("message.webglnotsupported");
      errorOccured.value = true;
      return;
  }

  const { rects, errors } = parseRectInfo(rectInfo.value);
  if (errors.length > 0) {
    errorMessage.value = errors.map(e => `Line ${e.line}: ${e.message}`).join("\n");
    errorOccured.value = true;
  } else {
    three.setRects(rects);
    numRects.value = rects.length;
  }

	const width = containerRef.value!.scrollWidth;
	three.resize(width, width / 16 * 9);
	// document.getElementById("canvas")!.appendChild(renderer.domElement);

	onResize();
	window.addEventListener('resize', onResize);
});

// Watchers
watch(rectInfo, (newText) => {
  if (!three) {
    return;
  }
  const { rects, errors } = parseRectInfo(newText);
  if (errors.length > 0) {
    errorMessage.value = errors.map(e => `Line ${e.line}: ${e.message}`).join("\n");
    errorOccured.value = true;
  } else {
    errorOccured.value = false;
    errorMessage.value = '';
    three.setRects(rects);
  }
});

watch(showAxes, (newVal) => {
  if (three) {
    three.showAxes = newVal;
  }
}, { immediate: true });

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

// Load STL
function loadSTLFromFile(aFile)
{
  if (!three) {
    return;
  }
  three.loadStl(aFile);
}

function onResize()
{
  const el = document.getElementById("controllerBox");
  if (!three || !el) {
    return;
  }
    const width = el.scrollWidth;
    const height = width / 16 * 9;

    three.resize(width, height);
}

onUnmounted(() => {
  three?.dispose();
  three = null;
});
</script>
