<template>
  <div id="app">
    <div class="progress-bar" aria-hidden="true"></div>

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

    <FallbackBackground v-else @loaded="onBackgroundLoaded" @progress="onBackgroundProgress" />

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
import FallbackBackground from "./components/FallbackBackground.vue";
import Main from "./components/Main.vue";
import Footer from "./components/Footer.vue";
import { resolveBackgroundQuality } from "./utils/backgroundQuality.js";

const GaussianSplatBackground = defineAsyncComponent(
  () => import("./components/GaussianSplatBackground.vue"),
);

export default {
  name: "App",
  components: {
    GaussianSplatBackground,
    FallbackBackground,
    IntroAnimation,
    Main,
    Footer,
  },
  data() {
    return {
      backgroundLoaded: false,
      introDone: false,
      backgroundProgress: 0,
      backgroundQuality: resolveBackgroundQuality(),
      useFallbackBackground: false,
    };
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
  },
};
</script>

<style>
/*
 * デザイントークン。役割ベースで定義してあるので、テーマ変更はここの値だけを差し替える。
 * アルファ違いで使う色は RGB 三つ組 (--*-rgb) として持ち、使用側でアルファを付けて参照する。
 */
:root {
  /* フォント。英数字は Poppins、日本語グリフは Poppins に無いので Zen Maru Gothic へ落ちる */
  --font-body: "Poppins", "Zen Maru Gothic", sans-serif;
  --font-latin: "Poppins", sans-serif;
  /* Doto はラテン文字のみ。英字の強調にだけ使う */
  --font-display: "Doto", "Poppins", monospace;

  /* 装飾の傾き。3D 背景のスピード線と揃える共通値 */
  --deco-angle: -12deg;
  /* セクション境目の斜めカットの高さ。tan(12deg) = 0.2126 なので 21.26vw で --deco-angle と一致する。
     〜1505px までは 12° を維持し、それ以上では 320px で頭打ちにして角度が浅くなる
     (1920px で約 9.5°)。超ワイド画面でセクション間の空白が過大になるのを避けるための意図的な妥協 */
  --section-cut: min(21.26vw, 320px);

  /* RGB 三つ組 (アルファ違いで多用する色) */
  --color-primary-rgb: 79 207 114;
  --color-ink-rgb: 22 36 27;
  --color-surface-rgb: 255 255 255;
  --color-mint-rgb: 223 243 234;
  /* 黒の三つ組。暗い面を作る用途 (GaussianSplatBackground のデバッグ HUD) */
  --color-shadow-rgb: 0 0 0;

  /* 背景 */
  --color-bg: #f3fbf6;
  --color-bg-overlay: #f3fbf6;
  --color-intro-bg: #ffffff;

  /* ブランドカラー */
  --color-primary: #4fcf72;
  --color-primary-light: #9fe3b4;
  /* 明るい面の上に載せる緑。大きい文字・アイコン・枠線用 (#f3fbf6 に対して 3.9:1) */
  --color-primary-deep: #1f8f45;
  /* 本文サイズの緑文字・リンク用。AA を満たすところまで暗くしてある (5.1:1) */
  --color-primary-text: #1a7a3b;
  /* 差し色。ホバーや小さなアクセントのごく小面積のみ */
  --color-neon: #8cff7a;

  /* 面 */
  --color-surface: #ffffff;
  --color-surface-mint: #dff3ea;

  /* 文字 */
  --color-ink: #16241b;
  --color-ink-sub: #4a5f52;
  /* 暗い面の上に載る明るい文字 (GaussianSplatBackground のデバッグ HUD)。
     明るい面の上の文字には流用しないこと */
  --color-text-on-dark: #dff3ea;

  /* 個別パーツ */
  --color-intro-line: #1f8f45;
  /* 明るい背景でも読める赤 (#f3fbf6 に対して 5.3:1) */
  --color-error: #c62828;

  /* カードの共通シェイプ (ドット風オフセット影を引き継ぐ) */
  --card-radius: 14px;
  --card-shadow: 6px 6px 0 var(--color-primary);
  --card-shadow-hover: 3px 3px 0 var(--color-primary);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  min-height: 100vh;
  color: var(--color-ink);
  line-height: 1.7;
  position: relative;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}

img {
  display: block;
  max-width: 100%;
}

/* ページの読み進めバー。scroll() タイムライン非対応 (Firefox) では出さない */
.progress-bar {
  display: none;
}

@supports (animation-timeline: scroll()) {
  .progress-bar {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--color-primary);
    z-index: 9999;
    box-shadow: 0 1px 0 rgb(var(--color-ink-rgb) / 0.15);
    transform-origin: 0 50%;
    animation: progress-grow linear both;
    animation-timeline: scroll(root);
  }
}

@keyframes progress-grow {
  from {
    scale: 0 1;
  }
  to {
    scale: 1 1;
  }
}

@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }

  /*
   * スクロールリビール (useScrollReveal が .is-revealed を付ける)。
   * reduced-motion では何も隠さない。要素は最初から最終状態のまま。
   * 要素ごとに --reveal-x / --reveal-y / --reveal-duration / --reveal-stagger で上書きできる
   */
  [data-reveal]:not(.is-revealed) {
    opacity: 0;
    visibility: hidden;
  }

  [data-reveal].is-revealed {
    /* カード側の hover は translate プロパティを使うので、こちらは transform で動かす。
       fill は backwards だけにして、終了後に transform / opacity を残さない */
    animation: reveal var(--reveal-duration, 0.7s) cubic-bezier(0.25, 1, 0.5, 1) backwards;
    animation-delay: calc(var(--reveal-index, 0) * var(--reveal-stagger, 90ms));
  }
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translate(var(--reveal-x, 0), var(--reveal-y, 40px));
  }
}

::selection {
  background: var(--color-primary);
  color: var(--color-ink);
}

:focus-visible {
  outline: 3px solid var(--color-primary-deep);
  outline-offset: 3px;
}

::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--color-surface-mint);
}

::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 999px;
  border: 3px solid var(--color-surface-mint);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-deep);
}
</style>
