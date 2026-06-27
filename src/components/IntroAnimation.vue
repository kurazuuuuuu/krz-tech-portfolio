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

const props = defineProps({
  // 背景アセット (3DGS) のロード完了フラグ。true で線を 100% まで引き切る
  ready: {
    type: Boolean,
    default: false,
  },
  // 実際のロード進捗 (0-100)。線の伸び具合に反映する
  progress: {
    type: Number,
    default: 0,
  },
  // 最低表示時間 (ms)。ロードが一瞬で終わっても急に消えないように
  minDuration: {
    type: Number,
    default: 1300,
  },
  // 安全弁: 進捗がこの時間 (ms) まったく更新されない (フリーズ) 場合のみ閉じる。
  // ロードが進んでいる限りは何秒かかっても待ち続ける。
  stallTimeout: {
    type: Number,
    default: 10000,
  },
});

// 王冠ラインの形状 (px, viewBox は実寸なのでそのまま画面ピクセル)
const CROWN_HALF = 140; // 王冠の半幅
const CROWN_RISE = 60; // 王冠の高さ
const VALLEY = 70; // 谷の水平オフセット

const showAnimation = ref(true);
const w = ref(window.innerWidth);
const h = ref(window.innerHeight);
// 表示上の進捗。実ロード進捗へ滑らかに追従させてカクつきを防ぐ
const displayProgress = ref(0);
// 描画済みラインの先端座標 (グローを追従させる)
const pathEl = ref(null);
const tipX = ref(0);
const tipY = ref(0);

// 王冠は中央固定・左右の直線だけ画面幅に追従。右端から左端へ向かって描く
const linePath = computed(() => {
  const cx = w.value / 2;
  const cy = h.value / 2;
  const top = cy - CROWN_RISE;
  return [
    `M ${w.value} ${cy}`, // 右端から開始
    `L ${cx + CROWN_HALF} ${cy}`, // 右の水平線
    `L ${cx + CROWN_HALF} ${top}`, // 右の柱 (垂直に上昇)
    `L ${cx + VALLEY} ${cy}`, // 谷2
    `L ${cx} ${top}`, // 中央の山
    `L ${cx - VALLEY} ${cy}`, // 谷1
    `L ${cx - CROWN_HALF} ${top}`, // 左の柱の頂点
    `L ${cx - CROWN_HALF} ${cy}`, // 左の柱 (垂直に下降)
    `L 0 ${cy}`, // 左の水平線
  ].join(" ");
});

let raf = null;
let minElapsed = false;
let hidden = false;
let minTimer = null;
// 進捗が最後に更新された時刻 (フリーズ検出の基準)
let lastProgressAt = 0;

const hide = () => {
  if (hidden) return;
  hidden = true;
  showAnimation.value = false;
  if (raf) cancelAnimationFrame(raf);
  clearTimeout(minTimer);
};

const onResize = () => {
  w.value = window.innerWidth;
  h.value = window.innerHeight;
};

const tick = () => {
  // ロード完了なら 100%、未完了なら実進捗を目標値にして滑らかに追従
  const target = props.ready ? 100 : props.progress;
  displayProgress.value += (target - displayProgress.value) * 0.12;

  // 描画済みの先端座標を取得してグローを追従させる
  if (pathEl.value) {
    const len = pathEl.value.getTotalLength();
    const pt = pathEl.value.getPointAtLength((len * displayProgress.value) / 100);
    tipX.value = pt.x;
    tipY.value = pt.y;
  }

  // 「最低表示時間が経過」かつ「ロード完了」かつ「線をほぼ引き切った」で閉じる
  if (minElapsed && props.ready && displayProgress.value > 99.5) {
    displayProgress.value = 100;
    hide();
    return;
  }
  // 安全弁: 線を引き切る前 (99%未満) に進捗が stallTimeout の間まったく
  // 動かなくなった = ロードがフリーズした、とみなして閉じる。
  // 正常にロードが進んでいる限りここは発火せず、何秒でも待ち続ける。
  if (displayProgress.value < 99 && performance.now() - lastProgressAt > props.stallTimeout) {
    hide();
    return;
  }
  raf = requestAnimationFrame(tick);
};

// 進捗が動くたびにタイムスタンプを更新 (フリーズ検出の基準)
watch(
  () => props.progress,
  () => {
    lastProgressAt = performance.now();
  },
);

onMounted(() => {
  window.addEventListener("resize", onResize);
  lastProgressAt = performance.now();
  minTimer = setTimeout(() => {
    minElapsed = true;
  }, props.minDuration);
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
  background: white;
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
  stroke: #3a6b3a;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.line-tip {
  fill: #7db87d;
}

/* Vue Transition styles */
.fade-leave-active {
  transition: opacity 0.4s ease-out;
}

.fade-leave-to {
  opacity: 0;
}
</style>
