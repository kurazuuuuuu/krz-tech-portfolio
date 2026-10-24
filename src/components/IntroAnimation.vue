<template>
  <Transition name="fade">
    <div v-if="showAnimation" class="intro-overlay">
      <svg class="intro-line" :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none">
        <defs>
          <filter id="tip-glow" x="-400%" y="-400%" width="900%" height="900%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          ref="pathEl"
          :d="linePath"
          class="line-path"
          pathLength="100"
          stroke-dasharray="100"
          :stroke-dashoffset="100 - displayProgress"
        />
        <circle
          v-show="displayProgress > 0.5 && displayProgress < 99.5"
          :cx="tipX"
          :cy="tipY"
          r="2.5"
          class="line-tip"
          filter="url(#tip-glow)"
        />
      </svg>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { isIntroProgressDone, isIntroStalled } from "../utils/introAnimationLogic.js";

const props = defineProps({
  ready: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  minDuration: {
    type: Number,
    default: 1300,
  },
  stallTimeout: {
    type: Number,
    default: 10000,
  },
});

const CROWN_HALF = 140;
const CROWN_RISE = 60;
const VALLEY = 70;

const emit = defineEmits(["done"]);

const showAnimation = ref(true);
const prefersReducedMotion = ref(
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);
const w = ref(window.innerWidth);
const h = ref(window.innerHeight);
const displayProgress = ref(0);
const pathEl = ref(null);
const tipX = ref(0);
const tipY = ref(0);

const linePath = computed(() => {
  const cx = w.value / 2;
  const cy = h.value / 2;
  const top = cy - CROWN_RISE;
  return [
    `M ${w.value} ${cy}`,
    `L ${cx + CROWN_HALF} ${cy}`,
    `L ${cx + CROWN_HALF} ${top}`,
    `L ${cx + VALLEY} ${cy}`,
    `L ${cx} ${top}`,
    `L ${cx - VALLEY} ${cy}`,
    `L ${cx - CROWN_HALF} ${top}`,
    `L ${cx - CROWN_HALF} ${cy}`,
    `L 0 ${cy}`,
  ].join(" ");
});

let raf = null;
let minElapsed = false;
let hidden = false;
let minTimer = null;
let lastProgressAt = 0;

const hide = () => {
  if (hidden) return;
  hidden = true;
  showAnimation.value = false;
  emit("done");
  if (raf) cancelAnimationFrame(raf);
  clearTimeout(minTimer);
};

const onResize = () => {
  w.value = window.innerWidth;
  h.value = window.innerHeight;
};

const tick = () => {
  const target = props.ready ? 100 : props.progress;
  const smoothing = prefersReducedMotion.value ? 1 : 0.12;
  displayProgress.value += (target - displayProgress.value) * smoothing;

  if (pathEl.value) {
    const len = pathEl.value.getTotalLength();
    const pt = pathEl.value.getPointAtLength((len * displayProgress.value) / 100);
    tipX.value = pt.x;
    tipY.value = pt.y;
  }

  const progressDone = isIntroProgressDone({
    ready: props.ready,
    minElapsed,
    displayProgress: displayProgress.value,
    prefersReducedMotion: prefersReducedMotion.value,
  });
  if (progressDone) {
    displayProgress.value = 100;
    hide();
    return;
  }
  if (
    isIntroStalled({
      displayProgress: displayProgress.value,
      lastProgressAt,
      stallTimeout: props.stallTimeout,
      now: performance.now(),
    })
  ) {
    hide();
    return;
  }
  raf = requestAnimationFrame(tick);
};

watch(
  () => props.progress,
  () => {
    lastProgressAt = performance.now();
  },
);

onMounted(() => {
  window.addEventListener("resize", onResize);
  lastProgressAt = performance.now();
  if (prefersReducedMotion.value) {
    minElapsed = true;
    displayProgress.value = props.ready ? 100 : props.progress;
    if (props.ready) {
      hide();
      return;
    }
  } else {
    minTimer = setTimeout(() => {
      minElapsed = true;
    }, props.minDuration);
  }
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  if (raf) cancelAnimationFrame(raf);
  clearTimeout(minTimer);
});
</script>

<style scoped>
.intro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--color-intro-bg);
  z-index: 9999;
  overflow: hidden;
}

.intro-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.line-path {
  fill: none;
  stroke: var(--color-intro-line);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.line-tip {
  fill: var(--color-primary);
}

.fade-leave-active {
  transition: opacity 0.4s ease-out;
}

.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-leave-active {
    transition: none;
  }
}
</style>
