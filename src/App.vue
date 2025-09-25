<template>
  <div id="app">
    <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    <IntroAnimation />
    <Header />
    <Main />
    <Footer />
  </div>
</template>

<script>
import IntroAnimation from './components/IntroAnimation.vue'
import Header from './components/Header.vue'
import Main from './components/Main.vue'
import Footer from './components/Footer.vue'

export default {
  name: 'App',
  components: {
    IntroAnimation,
    Header,
    Main,
    Footer
  },
  data() {
    return {
      scrollProgress: 0
    }
  },
  mounted() {
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
    }
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
  background-image: url('/img/vrc_background.webp');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  min-height: 100vh;
  color: #2d5a2d;
  line-height: 1.4;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 25% 25%, rgba(168, 230, 163, 0.3) 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, rgba(168, 230, 163, 0.3) 2px, transparent 2px),
    rgba(232, 245, 232, 0.7);
  background-size: 20px 20px, 20px 20px, 100% 100%;
  background-position: 0 0, 10px 10px, 0 0;
  pointer-events: none;
  z-index: -1;
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