<template>
  <div v-if="showAnimation" class="intro-overlay">
    <div ref="animationContainer" class="animation-container"></div>
  </div>
</template>

<script>
import lottie from 'lottie-web'

export default {
  name: 'IntroAnimation',
  data() {
    return {
      showAnimation: true,
      animation: null
    }
  },
  mounted() {
    this.loadAnimation()
    // 1.3秒後にフェードアウト開始
    setTimeout(() => {
      this.$el.style.opacity = '1'
      this.$el.style.transition = 'opacity 0.2s ease-out'
      this.$el.style.opacity = '0'
    }, 1300)
    // 1.5秒後に完全に非表示
    setTimeout(() => {
      this.showAnimation = false
    }, 1500)
  },
  methods: {
    loadAnimation() {
      this.animation = lottie.loadAnimation({
        container: this.$refs.animationContainer,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: '/simple_intro_animation.json?v=' + Date.now(),
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          viewBoxOnly: true
        }
      })
      
      // レスポンシブ対応
      this.animation.resize()
      

    }
  },
  beforeUnmount() {
    if (this.animation) {
      this.animation.destroy()
    }
  }
}
</script>

<style scoped>
.intro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  z-index: 9999;
  overflow: hidden;
}

.animation-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.animation-container svg {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}


</style>