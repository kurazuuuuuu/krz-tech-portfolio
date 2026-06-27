<template>
  <Transition name="fade">
    <div v-if="showAnimation" class="intro-overlay">
      <div ref="animationContainer" class="animation-container"></div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import lottie from "lottie-web";

const props = defineProps({
  // 3DGS など背景アセットのロード完了フラグ。true になるまでイントロを保持する
  ready: {
    type: Boolean,
    default: false,
  },
  // アニメーションの最低表示時間 (ms)。ロードが一瞬で終わっても急に消えないように
  minDuration: {
    type: Number,
    default: 1300,
  },
  // 安全弁: ロードが終わらなくてもこの時間で強制的に閉じる (ms)
  maxWait: {
    type: Number,
    default: 10000,
  },
});

const showAnimation = ref(true);
const animationContainer = ref(null);
let animation = null;

let minElapsed = false;
let hidden = false;
let minTimer = null;
let maxTimer = null;

const hide = () => {
  if (hidden) return;
  hidden = true;
  showAnimation.value = false;
  clearTimeout(minTimer);
  clearTimeout(maxTimer);
};

// 「最低表示時間が経過」かつ「ロード完了」の両方を満たしたら閉じる
const maybeHide = () => {
  if (minElapsed && props.ready) hide();
};

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

  // 最低表示時間が経過したら、ロード完了を待って閉じる
  minTimer = setTimeout(() => {
    minElapsed = true;
    maybeHide();
  }, props.minDuration);

  // 安全弁: ロードが終わらない場合でも強制的に閉じる
  maxTimer = setTimeout(hide, props.maxWait);
});

// ロード完了通知が来たタイミングでも判定する
watch(() => props.ready, maybeHide);

onBeforeUnmount(() => {
  clearTimeout(minTimer);
  clearTimeout(maxTimer);
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
