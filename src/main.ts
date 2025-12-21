// RectPlacer - place rectangular prisms onto the scene
// Last Modified: 2025/12/21 11:35:36
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

import { createApp } from 'vue';
import App from './App.vue';
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
            showAxes: 'Show Axes',
            numberOfRectangles: 'Number of rectangles: {count}',
            parsingRectangles: 'Parsing rectangle definitions...',
            // error messages
            webglnotsupported: 'WebGL is not supported in this environment.',
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
            showAxes: '座標軸を表示',
            numberOfRectangles: '矩形の数: {count}',
            parsingRectangles: '矩形定義を解析中...',
            // error messages
            webglnotsupported: 'この環境ではWebGLがサポートされていません。',
        },
    }
};

const i18n = createI18n({
    legacy: false,
    locale: navigator.language.split('-')[0],
    fallbackLocale: 'en',
    messages,
});

// Import Bulma and Font Awesome here to apply globally
import 'bulma/css/bulma.css';
import '@fortawesome/fontawesome-free/css/all.css';

// setup Vue app
const app = createApp(App).use(i18n).mount("#app");
