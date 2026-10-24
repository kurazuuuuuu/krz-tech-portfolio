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

    <FallbackBackground v-else />

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
      this.backgroundProgress = 100;
      this.backgroundLoaded = true;
    },
  },
};
</script>

<style>
:root {
  --font-body: "Poppins", "Zen Maru Gothic", sans-serif;
  --font-latin: "Poppins", sans-serif;
  --font-display: "Doto", "Poppins", monospace;

  --deco-angle: -12deg;
  --section-cut: min(21.26vw, 320px);

  --color-primary-rgb: 79 207 114;
  --color-ink-rgb: 22 36 27;
  --color-surface-rgb: 255 255 255;
  --color-mint-rgb: 223 243 234;
  --color-shadow-rgb: 0 0 0;

  --color-bg: #f3fbf6;
  --color-bg-overlay: #f3fbf6;
  --color-intro-bg: #ffffff;

  --color-primary: #4fcf72;
  --color-primary-light: #9fe3b4;
  --color-primary-deep: #1f8f45;
  --color-primary-text: #1a7a3b;
  --color-neon: #8cff7a;

  --color-surface: #ffffff;
  --color-surface-mint: #dff3ea;

  --color-ink: #16241b;
  --color-ink-sub: #4a5f52;
  --color-text-on-dark: #dff3ea;

  --color-intro-line: #1f8f45;
  --color-error: #c62828;

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

  [data-reveal]:not(.is-revealed) {
    opacity: 0;
    visibility: hidden;
  }

  [data-reveal].is-revealed {
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
