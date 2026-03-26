<template>
  <Transition name="fade">
    <div v-if="showAnimation" class="intro-overlay">
      <div ref="animationContainer" class="animation-container"></div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import lottie from "lottie-web";

const props = defineProps({
  sceneReady: {
    type: Boolean,
    default: false,
  },
  sceneFailed: {
    type: Boolean,
    default: false,
  },
  minDuration: {
    type: Number,
    default: 1300,
  },
});

const showAnimation = ref(true);
const animationContainer = ref(null);
const minimumDurationElapsed = ref(false);
const canClose = computed(
  () => minimumDurationElapsed.value && (props.sceneReady || props.sceneFailed),
);

let animation = null;
let minimumDurationTimer = null;

const syncAnimationVisibility = () => {
  if (canClose.value) {
    showAnimation.value = false;
  }
};

watch(canClose, syncAnimationVisibility, { immediate: true });

watch(showAnimation, (isVisible) => {
  if (!isVisible && animation) {
    animation.destroy();
    animation = null;
  }
});

onMounted(() => {
  animation = lottie.loadAnimation({
    container: animationContainer.value,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: "/simple_intro_animation.json?v=" + Date.now(),
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
      viewBoxOnly: true,
    },
  });

  // レスポンシブ対応
  animation.resize();

  minimumDurationTimer = window.setTimeout(() => {
    minimumDurationElapsed.value = true;
    syncAnimationVisibility();
  }, props.minDuration);
});

onBeforeUnmount(() => {
  if (minimumDurationTimer) {
    window.clearTimeout(minimumDurationTimer);
  }

  if (animation) {
    animation.destroy();
  }
});
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

:deep(.animation-container svg) {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}

/* Vue Transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
