<template>
  <div ref="container" class="splat-container"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import radUrl from "../assets/background-lod.rad?url";
import { createRadSource } from "./background/radSource.js";
import { createSplatLook } from "./background/splatLook.js";
import { createSpeedLines } from "./background/speedLines.js";

const CAMERA_POSITION = [0, 0.3, -0.5];
const CAMERA_LOOK_AT = [0, 0.09, -1];
const CAMERA_FOV = 40;
const SCENE_ROTATION_X_RAD = 2.6012;
const SCENE_SCALE = 1.7493;
const PARALLAX_RANGE = 0.1;
const PARALLAX_VERTICAL_RATIO = 0.3;
const PARALLAX_EASE = 0.05;
const PARALLAX_SETTLED_DISTANCE = 1e-4;

const REVEAL_RANGE = { near: 0.86, far: 3.73 };
const REVEAL_BAND = 0.25;
const REVEAL_END = 1 + REVEAL_BAND;
const REVEAL_DURATION_MS = 2500;
const REVEAL_DELAY_MS = 300;

const MAX_RENDER_PIXELS = 4_000_000;
const MAX_PIXEL_RATIO = { high: 2, medium: 1.5, low: 1 };
const ACTIVE_FPS = 60;
const FRAME_TOLERANCE_MS = 2;
const PREFIX_PROGRESS_LIMIT = 95;

const TUNING = {
  bgColor: "#f3fbf6",
  idleFps: 30,
  parallaxScale: 1.0,

  lineCount: { high: 50, medium: 24, low: 12 },
  lineAngleDeg: -12,
  lineAngleJitterDeg: 3,
  lineLengthMin: 0.12,
  lineLengthMax: 0.45,
  lineWidthMin: 0.0015,
  lineWidthMax: 0.01,
  lineSpeedMin: 0.02,
  lineSpeedMax: 0.07,
  lineDepthNear: 0.6,
  lineDepthFar: 6.0,
  lineFogNear: 2,
  lineFogFar: 8,
  lineColors: {
    vivid: "#4fcf72",
    ink: "#16241b",
    neon: "#8cff7a",
    white: "#ffffff",
  },
  lineColorWeights: { vivid: 60, ink: 15, neon: 15, white: 10 },
};

const props = defineProps({
  quality: {
    type: String,
    default: "medium",
  },
  reveal: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["loaded", "progress", "error"]);

const container = ref(null);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const debugEnabled = new URLSearchParams(window.location.search).has("debug");
const prefixAbort = new AbortController();
const mouse = { x: 0, y: 0 };

let camera = null;
let lookTarget = null;
let splatRenderer = null;
let splatScene = null;
let spark = null;
let mesh = null;
let look = null;
let lineRenderer = null;
let lineScene = null;
let speedLines = null;
let debugPanel = null;
let animationId = null;
let lastTime = 0;
let targetFps = ACTIVE_FPS;
let revealElapsed = 0;
let revealFront = prefersReducedMotion ? REVEAL_END : 0;
let splatsDirty = true;
let linesDirty = true;
let waitingForFirstChunk = true;
let disposed = false;

const qualityKey = () => (props.quality in TUNING.lineCount ? props.quality : "medium");

const resolvePixelRatio = (w, h) => {
  const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / Math.max(w * h, 1));
  return Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO[qualityKey()], budgetRatio);
};

const fail = (err) => {
  if (disposed) return;
  console.error("[GaussianSplatBackground] Failed to initialize:", err);
  emit("error");
};

const onResize = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = resolvePixelRatio(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  for (const renderer of [splatRenderer, lineRenderer]) {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h);
  }
  speedLines.handleResize();
  splatsDirty = true;
  linesDirty = true;
};

const onMouseMove = (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
};

const onVisibilityChange = () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
    animationId = null;
  } else if (!animationId) {
    lastTime = 0;
    animate();
  }
};

const updateCamera = (dt) => {
  if (prefersReducedMotion) return false;
  const range = PARALLAX_RANGE * TUNING.parallaxScale;
  const dx = CAMERA_POSITION[0] + mouse.x * range - camera.position.x;
  const dy = CAMERA_POSITION[1] + mouse.y * range * PARALLAX_VERTICAL_RATIO - camera.position.y;
  if (Math.abs(dx) < PARALLAX_SETTLED_DISTANCE && Math.abs(dy) < PARALLAX_SETTLED_DISTANCE) {
    return false;
  }
  const ease = 1 - Math.pow(1 - PARALLAX_EASE, dt / (1000 / 60));
  camera.position.x += dx * ease;
  camera.position.y += dy * ease;
  camera.lookAt(lookTarget);
  return true;
};

const updateReveal = (dt) => {
  if (!props.reveal || revealFront >= REVEAL_END) return false;
  revealElapsed += dt;
  const p = Math.min(Math.max((revealElapsed - REVEAL_DELAY_MS) / REVEAL_DURATION_MS, 0), 1);
  revealFront = (1 - (1 - p) * (1 - p)) * REVEAL_END;
  look.setRevealFront(revealFront);
  mesh.updateVersion();
  return true;
};

const notifyFirstChunk = () => {
  if (!waitingForFirstChunk || spark.activeSplats === 0) return;
  waitingForFirstChunk = false;
  emit("progress", 100);
  emit("loaded");
};

const animate = (time = 0) => {
  animationId = requestAnimationFrame(animate);
  if (time - lastTime < 1000 / targetFps - FRAME_TOLERANCE_MS) return;
  const dt = Math.min(time - lastTime, 100);
  lastTime = time;

  const cameraMoved = updateCamera(dt);
  const revealing = updateReveal(dt);
  if (props.reveal && !revealing) targetFps = TUNING.idleFps;

  if (cameraMoved || revealing || splatsDirty) {
    splatsDirty = false;
    splatRenderer.render(splatScene, camera);
    notifyFirstChunk();
  }

  if (props.reveal && (!prefersReducedMotion || linesDirty)) {
    linesDirty = false;
    speedLines.update(dt, revealFront);
    lineRenderer.render(lineScene, camera);
  }
};

const setupDebugPanel = async () => {
  if (!debugEnabled) return;
  const { createDebugPanel } = await import("./background/debugPanel.js");
  const panel = createDebugPanel({
    tuning: TUNING,
    quality: qualityKey(),
    apply: () => speedLines.applyTuning(),
    rebuild: () => speedLines.rebuild(TUNING.lineCount[qualityKey()]),
  });
  if (disposed) panel.destroy();
  else debugPanel = panel;
};

const createLayer = (THREE, options) => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, ...options });
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(resolvePixelRatio(w, h));
  renderer.setSize(w, h);
  container.value.appendChild(renderer.domElement);
  return renderer;
};

const init = async (radSource) => {
  const [THREE, SPARK] = await Promise.all([import("three"), import("@sparkjsdev/spark")]);
  if (disposed) return;

  lookTarget = new THREE.Vector3().fromArray(CAMERA_LOOK_AT);
  camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );
  camera.position.fromArray(CAMERA_POSITION);
  camera.lookAt(lookTarget);

  splatRenderer = createLayer(THREE);
  splatRenderer.setClearColor(new THREE.Color(TUNING.bgColor), 1);
  splatScene = new THREE.Scene();

  lineRenderer = createLayer(THREE, { alpha: true, depth: false });
  lineScene = new THREE.Scene();
  speedLines = createSpeedLines(THREE, {
    camera,
    tuning: TUNING,
    count: TUNING.lineCount[qualityKey()],
    revealBand: REVEAL_BAND,
    motionless: prefersReducedMotion,
  });
  speedLines.setRevealRange(REVEAL_RANGE.near, REVEAL_RANGE.far);
  lineScene.add(speedLines.mesh);

  spark = new SPARK.SparkRenderer({
    renderer: splatRenderer,
    onDirty: () => {
      splatsDirty = true;
    },
  });
  splatScene.add(spark);

  look = createSplatLook(SPARK, {
    viewOrigin: CAMERA_POSITION,
    backgroundColor: TUNING.bgColor,
    revealRange: REVEAL_RANGE,
    revealBand: REVEAL_BAND,
    initialRevealFront: revealFront,
  });

  mesh = new SPARK.SplatMesh({
    url: radUrl,
    paged: new SPARK.PagedSplats({
      fetchSource: radSource,
      fileType: SPARK.SplatFileType.RAD,
    }),
    worldModifier: look.worldModifier,
  });
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), SCENE_ROTATION_X_RAD);
  mesh.scale.setScalar(SCENE_SCALE);
  splatScene.add(mesh);

  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (!prefersReducedMotion) window.addEventListener("mousemove", onMouseMove);

  setupDebugPanel().catch(console.warn);
  animate();
};

onMounted(() => {
  const radSource = createRadSource(radUrl, {
    signal: prefixAbort.signal,
    onPrefixProgress: (ratio) => emit("progress", ratio * PREFIX_PROGRESS_LIMIT),
  });
  radSource.prefix.catch(fail);
  init(radSource).catch(fail);
});

onBeforeUnmount(() => {
  disposed = true;
  prefixAbort.abort();
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  cancelAnimationFrame(animationId);
  debugPanel?.destroy();
  speedLines?.dispose();
  mesh?.dispose();
  spark?.dispose();
  splatRenderer?.dispose();
  lineRenderer?.dispose();
});
</script>

<style scoped>
.splat-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.splat-container :deep(canvas) {
  position: absolute;
  inset: 0;
}
</style>
