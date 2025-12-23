// src/App.vue
// Last Modified: 2025/12/23 09:49:17
<template>
	<div v-cloak>
		<nav class="navbar">
			<div class="navbar-brand">
                        <a class="navbar-item" href="#">
				<h1 class="title">
				{{ $t("message.rectplacertitle") }}
				</h1></a>
                  <a class="navbar-burger" :class="{ 'is-active': isBurgerActive }" role="button" aria-label="menu" aria-expanded="false" @click="isBurgerActive=!isBurgerActive">
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
          </a>
      </div>
      <div class="navbar-menu" :class="{ 'is-active' : isBurgerActive }">
          <div class="navbar-end">
              <a class="navbar-item" href="docs/" target="_blank" rel="noopener noreferrer"><span class="icon-text"><span class="icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></span><span>Docs</span></span></a>
              <button class="navbar-item" @click="toggleSettingsModal"><span class="icon-text"><span class="icon"><i class="fa-solid fa-gear"></i></span><span>Settings</span></span></button>
          </div>
      </div>
		</nav>
		<section class="section">
			<div class="container" ref="containerRef"></div>
      <div v-if="!systemStatus.ok" class="notification is-danger">
        {{ systemStatus.message }}
      </div>
		<div class="container">
			<div class="box" id="controllerBox">
				<div class="columns">
					<div class="column">
						<label class="label">{{ $t("message.rectInfo") }} (lx,ly,lz,x,y,z)</label>
						<div class="control has-icons-right">
							<textarea class="textarea" ref="rectTextAreaRef" v-model="rectInfo"
                  @click="updateWorkingLine"
                  @keyup.up="updateWorkingLine"
                  @keyup.down="updateWorkingLine"
                  @keyup.enter="updateWorkingLine"
                  @keyup.page-up="updateWorkingLine"
                  @keyup.page-down="updateWorkingLine"
                  @select="updateWorkingLine"
                  @focus="updateWorkingLine"
                  @blur="clearWorkingLine"
              ></textarea>
						</div>
            <div class="content is-size-7" :class="{ 'has-text-danger': rectStatus.ok === 'error' }" style="white-space: pre-line">{{ rectStatus.message }}</div>
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
              <button class="button is-small is-ghost" @click="showStlModal">{{ $t("message.stlSettings") }}</button>
							</div>
						<div class="control">
							<label class="checkbox"><input type="checkbox" v-model="showAxes">{{ $t("message.showAxes") }}</label>
						</div>			
						<div class="buttons">
								<button class="button is-primary" @click="takeScreenShot"><i class="fas fa-camera"></i>{{ $t("message.screenshot") }}</button>
								<button class="button is-primary" @click="saveRects"><i class="fas fa-file-csv"></i>{{ $t("message.saveRects") }}</button>
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
  <!-- modal for STL settings -->
  <div class="modal" :class="{ 'is-active': showStlModalFlag }" @close="showStlModalFlag = false">
  <div class="modal-background" @click="showStlModalFlag = false"></div>
  <div class="modal-content box">
    <h2 class="subtitle">{{ $t("message.stlModalTitle") }}</h2>
    <div class="control is-grouped">
      <label class="label">{{ $t("message.stlScale") }}</label>
      <input class="input" type="number" value="1.0" min="0" step="any" v-model.number="stlScale" />
    </div>
    <div class="buttons">
      <button class="button is-primary" @click="applyStlScale">{{ $t("message.apply") }}</button>
      <button class="button is-warning" @click="restorePreviousStlScale">{{ $t("message.close") }}</button>
    </div>
    </div>
  </div>
  <!-- modal -->
  <div class="modal" :class="{ 'is-active': isSettingsModalActive }">
      <div class="modal-background" @click="isSettingsModalActive = false;"></div>
      <div class="modal-content">
          <!-- Any other Bulma elements you want -->
          <div class="box">
              <h2 class="subtitle">{{ $t("message.settings") }}</h2>
              <div class="field is-grouped">
                  <label class="label"><span class="icon-text"><span class="icon"><i class="fas fa-desktop"></i></span><span>{{ $t("message.theme") }}</span></span></label>
                  <div class="control">
                      <label class="radio">
                      <input
                          type="radio"
                          name="theme"
                          value="light"
                          v-model="selectedTheme"
                          @change="setScreenMode(selectedTheme)"
                      />
                      <span class="icon-text"><span class="icon"><i class="fas fa-sun"></i></span><span>{{ $t("message.light") }}</span></span>
                      </label>
                      <label class="radio">
                      <input
                          type="radio"
                          name="theme"
                          value="dark"
                          v-model="selectedTheme"
                          @change="setScreenMode(selectedTheme)"
                      />
                      <span class="icon-text"><span class="icon"><i class="fas fa-moon"></i></span><span>{{ $t("message.dark") }}</span></span>
                      </label>
                      <label class="radio">
                      <input
                          type="radio"
                          name="theme"
                          value="system"
                          v-model="selectedTheme"
                          @change="setScreenMode(selectedTheme)"
                      />
                      <span class="icon-text"><span class="icon"><i class="fas fa-desktop"></i></span><span>{{ $t("message.system") }}</span></span>
                      </label>
                  </div>
              </div>
              <div class="field is-grouped">
                  <label class="label"><span class="icon-text"><span class="icon"><i class="fas fa-language"></i></span><span>Language</span></span></label>
                  <div class="control">
                      <label class="radio">
                      <input
                          type="radio"
                          name="lang"
                          value="en"
                          v-model="selectedLocale"
                          @change="locale = selectedLocale"
                      />
                      English
                      </label>
                      <label class="radio">
                      <input
                          type="radio"
                          name="lang"
                          value="ja"
                          v-model="selectedLocale"
                          @change="locale = selectedLocale"
                      />
                      Japanese / 日本語
                      </label>
                  </div>
              </div>
              <button class="button is-primary" @click="isSettingsModalActive = false;">{{ $t("message.close") }}</button>
          </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="isSettingsModalActive = false;"></button>
  </div>
</template>

<style scoped>
	[v-cloak] {
		display: none;
	}
</style>

<script setup lang="ts">
	// RectPlacer - place rectangular prisms onto the scene
// Copyright (C) 2024-2025 KONNO Akihisa <konno@researchers.jp>

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

import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { parseRectInfo } from "./domain/rectParser";
import { RectPlacerThree } from "./three/rectPlacerThree";

const containerRef = ref<HTMLElement | null>(null);
const rectTextAreaRef = ref<HTMLTextAreaElement | null>(null);
const systemStatus = reactive({
  ok: true,
  message: '',
});
const rectStatus = reactive({
  ok: 'ok' as 'ok' | 'error' | 'pending',
  message: '',
});

const { t, locale } = useI18n();

const rectInfo = ref("0.1,0.1,0.3,0.2,0,0.2");  // sample data
const selectedLocale = ref(locale.value);
const selectedTheme = ref('system');
const showAxes = ref(true);

const isBurgerActive = ref(false);
const isSettingsModalActive = ref(false);

const showStlModalFlag = ref(false);
const stlScale = ref(1.0);
let prevStlScale = 1.0;

let three: RectPlacerThree | null = null;

function toggleSettingsModal()
{
    isSettingsModalActive.value = !isSettingsModalActive.value;
}

// 初期設定：localStorageから取得したテーマを使い、即座に`data-theme`に反映させる
const initialTheme = localStorage.getItem('theme') || 'system';
selectedTheme.value = initialTheme;
document.documentElement.setAttribute('data-theme', initialTheme); // 初期テーマを適用
const theme = ref(initialTheme);

const setScreenMode = (mode_: string) => {
    // Screen mode
    if (mode_ == 'light' || mode_ == 'dark' || mode_ == 'system') {
        document.documentElement.setAttribute('data-theme', mode_);
        theme.value = mode_;
        // Save the theme to localStorage
        localStorage.setItem('theme', mode_);
    } else {
        console.error(`error: unsupported screen mode ${mode_} is specified.`);
    }
}

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

// Handle STL file upload
function onSTLUploaded(e: Event)
{
	// event(=e)から画像データを取得する
	const stlFile = (e.target as HTMLInputElement).files![0]
	console.log(stlFile.name);
	loadSTLFromFile(stlFile)
}

function loadSTLFromFile(aFile: File)
{
  if (!three) {
    return;
  }
  three.loadStl(aFile);
}

// STL scale from modal
function showStlModal()
{
  console.log("show STL modal");
  showStlModalFlag.value = true;
}

function applyStlScale()
{
  if (stlScale.value <= 0) {
    alert(t("message.stlScaleMustBePositive"));
    stlScale.value = prevStlScale;
    return;
  }
  if (!three) {
    return;
  }
  console.log("apply STL scale: ", stlScale.value);
  three.setStlScale(stlScale.value);
  prevStlScale = stlScale.value;
  showStlModalFlag.value = false;
}

function restorePreviousStlScale()
{
  stlScale.value = prevStlScale;
  showStlModalFlag.value = false;
}

function switchLocale()
{
	locale.value = selectedLocale.value;
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

// debouncing rectInfo update
let rectTimer: number | null = null;
let workingLine = -1;

function getCurrentLineNumber(text: string, caret: number): number {
  // caret は selectionStart（0-based）
  // 行番号は 1-based にする
  let line = 1;
  for (let i = 0; i < caret && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++; // '\n'
  }
  return line;
}

function updateWorkingLine() {
  if (!three) {
    return;
  }
  const textarea = rectTextAreaRef.value;
  if (!textarea) {
    console.warn("textarea not found");
    return;
  }
  const caret = textarea.selectionStart;
  const lineNumber = getCurrentLineNumber(rectInfo.value, caret);
  if (lineNumber === workingLine) {
    return;
  }
  workingLine = lineNumber;

  scheduleApplyRects(rectInfo.value, 0, "cursor"); // immediate update
}

function clearWorkingLine() {
  if (!three) {
    return;
  }
  workingLine = -1;
  scheduleApplyRects(rectInfo.value, 0, "cursor"); // immediate update
}

function scheduleApplyRects(text: string, delayMs = 200, reason: "text" | "cursor" = "text") {
  if (reason === "text") {
    rectStatus.ok = "pending"; // 入力中はとりあえずpending
    rectStatus.message = t("message.parsingRectangles");
  }

  if (rectTimer) window.clearTimeout(rectTimer);

  rectTimer = window.setTimeout(() => {
    const { rects, errors } = parseRectInfo(text, workingLine);
      if (errors.length > 0) {
        rectStatus.message = errors.map(e => `Line ${e.line}: ${e.message}`).join("\n");
        rectStatus.ok = 'error';
      } else {
        three?.setRects(rects);
        rectStatus.message = t("message.numberOfRectangles", { count: rects.length });
        rectStatus.ok = 'ok';
      }
  }, delayMs);
}

// Lifecycle hooks
onMounted(() => {
  // Initialize Three.js renderer
  if (!containerRef.value) {
    return;
  }
  try {
      three = new RectPlacerThree();
      three.mount(containerRef.value);
      systemStatus.ok = true;
  } catch (e) {
      systemStatus.message = t("message.webglnotsupported");
      systemStatus.ok = false;
      return;
  }

  const { rects, errors } = parseRectInfo(rectInfo.value);
  if (errors.length > 0) {
    rectStatus.message = errors.map(e => `Line ${e.line}: ${e.message}`).join("\n");
    rectStatus.ok = 'error';
  } else {
    rectStatus.message = t("message.numberOfRectangles", { count: rects.length });
    rectStatus.ok = 'ok';
    three.setRects(rects);
  }

	const width = containerRef.value!.scrollWidth;
	// document.getElementById("canvas")!.appendChild(renderer.domElement);

	onResize();
	window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  if (rectTimer) {
    window.clearTimeout(rectTimer);
    rectTimer = null;
  }
  window.removeEventListener('resize', onResize);
  three?.dispose();
  three = null;
});

// Watchers
watch(rectInfo, (newText: string) => {
  if (!three) {
    return;
  }
  scheduleApplyRects(newText);
});

watch(showAxes, (newVal: boolean) => {
  if (three) {
    three.showAxes = newVal;
  }
}, { immediate: true });
</script>
