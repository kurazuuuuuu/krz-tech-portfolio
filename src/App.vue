<template>
  <div id="app">
    <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>

    <GaussianSplatBackground
      v-if="!useFallbackBackground"
      splat-path="/background.splat"
      :quality="backgroundQuality"
      :point-size="0.02"
      :camera-position="[0, 0.3, -0.5]"
      :camera-look-at="[0, 0.09, -1]"
      :scene-rotation="[1, 0, 0, 0.3]"
      :scene-scale="[1.5, 1.5, 1.5]"
      :sh-degree="0"
      :reveal="introDone"
      @loaded="onBackgroundLoaded"
      @progress="onBackgroundProgress"
      @error="onBackgroundError"
    />

    <ThreeBackground v-else @loaded="onBackgroundLoaded" @progress="onBackgroundProgress" />

    <IntroAnimation
      :ready="backgroundLoaded"
      :progress="backgroundProgress"
      @done="introDone = true"
    />
    <Main :intro-done="introDone" />
    <Footer />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import IntroAnimation from "./components/IntroAnimation.vue";
import Main from "./components/Main.vue";
import Footer from "./components/Footer.vue";
import { resolveBackgroundQuality } from "./utils/backgroundQuality.js";

const GaussianSplatBackground = defineAsyncComponent(
  () => import("./components/GaussianSplatBackground.vue"),
);

const ThreeBackground = defineAsyncComponent(() => import("./components/ThreeBackground.vue"));

export default {
  name: "App",
  components: {
    GaussianSplatBackground,
    ThreeBackground,
    IntroAnimation,
    Main,
    Footer,
  },
  data() {
    return {
      scrollProgress: 0,
      backgroundLoaded: false,
      introDone: false,
      backgroundProgress: 0,
      backgroundQuality: resolveBackgroundQuality(),
      useFallbackBackground: false,
    };
  },
  mounted() {
    window.addEventListener("scroll", this.updateScrollProgress);
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.updateScrollProgress);
  },
  methods: {
    onBackgroundLoaded() {
      this.backgroundLoaded = true;
    },
    onBackgroundProgress(progress) {
      this.backgroundProgress = progress;
    },
    onBackgroundError() {
      this.useFallbackBackground = true;
    },
    updateScrollProgress() {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    },
  },
};
</script>

<style>
/*
 * カラートークン。役割ベースで定義してあるので、テーマ変更はここの値だけを差し替える。
 * アルファ違いで使う色は RGB 三つ組 (--*-rgb) として持ち、使用側でアルファを付けて参照する。
 */
:root {
  /* RGB 三つ組 (アルファ違いで多用する色) */
  --color-primary-rgb: 125 184 125;
  --color-primary-light-rgb: 168 230 163;
  --color-text-on-dark-rgb: 168 230 163;
  --color-surface-panel-rgb: 10 20 15;
  --color-surface-card-rgb: 30 60 30;
  --color-border-light-rgb: 255 255 255;
  --color-shadow-rgb: 0 0 0;

  /* 背景 */
  --color-bg: #111820;
  --color-bg-overlay: #050810;
  --color-intro-bg: #ffffff;

  /* ブランドカラー (面・境界線・ドット風オフセット影に使う 4 段ランプ) */
  --color-primary-light: rgb(var(--color-primary-light-rgb));
  --color-primary: rgb(var(--color-primary-rgb));
  --color-primary-hover: #6ba86b;
  --color-primary-shadow: #5a9a5a;

  /* パネル・カードの面 */
  --color-surface-terminal: #1a3d1a;
  --color-surface-card-hover: rgb(40 75 40 / 0.9);
  --color-surface-interactive-hover: rgb(50 90 50 / 0.9);

  /* 文字色 */
  --color-text-strong: #2d5a2d;
  --color-text-sub: #4a7a4a;
  --color-text-on-dark: rgb(var(--color-text-on-dark-rgb));
  --color-text-highlight: #c0f0c0;
  --color-text-on-primary: #ffffff;
  --color-text-on-primary-dark: #1a3d1a;

  /* 個別パーツ */
  --color-intro-line: #3a6b3a;
  --color-scrollbar-track: #e8f5e8;

  /* シグナル・エラー */
  --color-signal-red: #ff5f56;
  --color-signal-yellow: #ffbd2e;
  --color-signal-green: #27c93f;
  --color-error: #e57373;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  z-index: 9999;
  transition: width 0.1s ease;
  box-shadow: 0 2px 4px rgb(var(--color-primary-rgb) / 0.3);
}

body {
  font-family: "DotGothic16", monospace;
  background-color: var(--color-bg);
  min-height: 100vh;
  color: var(--color-text-strong);
  line-height: 1.4;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  position: relative;
}

#app {
  min-height: 100vh;
}

/* ドット風のスクロールバー */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--color-scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-hover);
}
</style>
