<template>
  <div id="app">
    <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>

    <!-- 3DGS スプラット背景 (public/background.splat を配置) -->
    <GaussianSplatBackground
      splat-path="/background.splat"
      quality="high"
      :camera-position="[0, 0.3, -0.5]"
      :camera-look-at="[0, 0.05, -1]"
      :parallax-range="0.05"
      :scene-rotation="[1, 0, 0, 0.3]" 
      :sh-degree="0"
    />

    <!-- 画像ポイントクラウド版 (フォールバック用) -->
    <!-- <ThreeBackground /> -->

    <IntroAnimation />
    <Header />
    <Main />
    <Footer />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import IntroAnimation from './components/IntroAnimation.vue'
import Header from './components/Header.vue'
import Main from './components/Main.vue'
import Footer from './components/Footer.vue'

const GaussianSplatBackground = defineAsyncComponent(() =>
  import('./components/GaussianSplatBackground.vue')
)

// 画像ポイントクラウド版 (フォールバック用)
// const ThreeBackground = defineAsyncComponent(() =>
//   import('./components/ThreeBackground.vue')
// )

export default {
  name: 'App',
  components: {
    GaussianSplatBackground,
    // ThreeBackground,
    IntroAnimation,
    Header,
    Main,
    Footer
  },
  data() {
    return {
      scrollProgress: 0,
      lastScrollY: 0,
      scrollProgress: 0,
      lastScrollY: 0
    }
  },
  mounted() {
    window.addEventListener('scroll', this.updateScrollProgress)
    window.addEventListener('scroll', this.updateScrollProgress)
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.updateScrollProgress)
  },
  methods: {

    updateScrollProgress() {
      const scrollTop = window.pageYOffset
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      this.scrollProgress = (scrollTop / docHeight) * 100
      
      const scrollDelta = scrollTop - this.lastScrollY
      this.lastScrollY = scrollTop
      
      this.lastScrollY = scrollTop
    },

  }
}
</script>

<style>
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
  background: linear-gradient(90deg, #7db87d, #a8e6a3);
  z-index: 9999;
  transition: width 0.1s ease;
  box-shadow: 0 2px 4px rgba(125, 184, 125, 0.3);
}



body {
  font-family: 'DotGothic16', monospace;
  background-color: #111820;
  min-height: 100vh;
  color: #2d5a2d;
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
  background: #e8f5e8;
}

::-webkit-scrollbar-thumb {
  background: #7db87d;
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: #6ba86b;
}
</style>