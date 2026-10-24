<template>
  <div ref="container" class="splat-container">
    <Transition name="fade">
      <div v-if="status !== 'ready'" class="loading-overlay">
        <span v-if="status === 'loading'" class="loading-text">
          Loading 3DGS scene... {{ Math.round(progress) }}%
        </span>
        <span v-else-if="status === 'error'" class="error-text">
          Failed to load: {{ splatPath }}
        </span>
      </div>
    </Transition>

    <div v-if="status === 'ready' && overlayEnabled" class="camera-info-overlay">
      <div class="info-row">
        <span class="label">POS:</span>
        <span class="value">{{ camPos.x }}, {{ camPos.y }}, {{ camPos.z }}</span>
      </div>
      <div class="info-row">
        <span class="label">DIR:</span>
        <span class="value">{{ camDir.x }}, {{ camDir.y }}, {{ camDir.z }}</span>
      </div>
      <div class="info-hint">Mouse drag to rotate/pan, scroll to zoom</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { createSpeedLines } from "./background/speedLines.js";

const TUNING = {
  bgColor: "#f3fbf6",
  idleFps: 30,

  inkDensity: 1,
  pointSizeScale: 1.5,
  pointSoftness: 0.6,
  colorA: "#4fcf72",
  colorB: "#9fe3b4",
  brightnessMode: 1,
  brightnessInfluence: 0.7,
  fogNear: 6,
  fogFar: 45,
  refPointPx: 3.5,
  repelStrength: 0.005,
  wobbleStrength: 0.01,
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
  splatPath: {
    type: String,
    default: "/scene.ply",
  },
  cameraPosition: {
    type: Array,
    default: () => [0, -2, 5],
  },
  cameraLookAt: {
    type: Array,
    default: () => [0, 0, 0],
  },
  parallaxRange: {
    type: Number,
    default: 0.1,
  },
  alphaThreshold: {
    type: Number,
    default: 5,
  },
  shDegree: {
    type: Number,
    default: 1,
  },
  pointSize: {
    type: Number,
    default: 0.012,
  },
  sceneRotation: {
    type: Array,
    default: () => [0, 0, 0, 1],
  },
  scenePosition: {
    type: Array,
    default: () => [0, 0, 0],
  },
  sceneScale: {
    type: Array,
    default: () => [1, 1, 1],
  },
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
const status = ref("loading");
const progress = ref(0);

const debugEnabled =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
const overlayEnabled = ref(debugEnabled);

const mouse = { x: 0, y: 0 };
const smoothMouse = { x: 0, y: 0 };
let basePos = null;
let lookTarget = null;

const camPos = ref({ x: "0.00", y: "0.00", z: "0.00" });
const camDir = ref({ x: "0.00", y: "0.00", z: "0.00" });

let renderer = null;
let camera = null;
let scene = null;
let splatMesh = null;
let splatUniforms = null;
let speedLines = null;
let debugPanel = null;
let animationId = null;
let THREE = null;
let SPARK = null;
let disposed = false;

const MAX_RENDER_PIXELS = 4_000_000;
const ACTIVE_FPS = 60;

const resolvePixelRatio = (w, h) => {
  const maxPixelRatio = props.quality === "high" ? 2 : props.quality === "low" ? 1 : 1.5;
  const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / Math.max(w * h, 1));
  return Math.min(window.devicePixelRatio, maxPixelRatio, budgetRatio);
};

const resolveQualityKey = () =>
  TUNING.lineCount[props.quality] === undefined ? "medium" : props.quality;

const REVEAL_DURATION_MS = 2500;
const REVEAL_DELAY_MS = 300;
const REVEAL_BAND = 0.25;
const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealElapsed = 0;
let revealFront = prefersReducedMotion ? 1 + REVEAL_BAND : 0;

const measureRevealRange = (positions, pointCount) => {
  splatMesh.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const stride = Math.max(1, Math.floor(pointCount / 20000));
  const v = new THREE.Vector3();
  const samples = [];
  for (let i = 0; i < pointCount; i += stride) {
    v.fromArray(positions, i * 3).applyMatrix4(splatMesh.matrixWorld);
    const dist = v.distanceTo(camera.position);
    v.project(camera);
    if (Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 || v.z < -1 || v.z > 1) continue;
    samples.push(dist);
  }
  if (samples.length < 10) return { near: Math.log(0.1), far: Math.log(10) };
  samples.sort((a, b) => a - b);
  const at = (q) => samples[Math.min(samples.length - 1, Math.floor(samples.length * q))];
  const near = Math.log(Math.max(at(0.01), 1e-3));
  const far = Math.log(Math.max(at(0.97), 1e-3));
  return { near, far: Math.max(far, near + 0.1) };
};

const onResize = () => {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(resolvePixelRatio(w, h));
  renderer.setSize(w, h);
  speedLines?.handleResize();
};

const onMouseMove = (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
};

const onVisibilityChange = () => {
  if (document.hidden) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if (!animationId) {
    lastTime = 0;
    animate();
  }
};

const fail = (err) => {
  console.error("[GaussianSplatBackground] Failed to initialize:", err);
  status.value = "error";
  emit("error");
  emit("loaded");
};

const applyTuning = () => {
  if (renderer) renderer.setClearColor(new THREE.Color(TUNING.bgColor), 1);
  if (splatMesh) splatMesh.material.size = props.pointSize * TUNING.pointSizeScale;
  if (splatUniforms) {
    splatUniforms.uInkDensity.value = TUNING.inkDensity;
    splatUniforms.uSoftness.value = TUNING.pointSoftness;
    splatUniforms.uColorA.value.set(TUNING.colorA);
    splatUniforms.uColorB.value.set(TUNING.colorB);
    splatUniforms.uBrightnessMode.value = Number(TUNING.brightnessMode);
    splatUniforms.uBrightnessInfluence.value = TUNING.brightnessInfluence;
    splatUniforms.uFog.value.set(TUNING.fogNear, TUNING.fogFar);
    splatUniforms.uRepelStrength.value = TUNING.repelStrength;
    splatUniforms.uWobble.value = TUNING.wobbleStrength;
    splatUniforms.uRefPointPx.value = TUNING.refPointPx;
  }
  speedLines?.applyTuning();
};

const rebuildSpeedLines = () => {
  speedLines?.rebuild(TUNING.lineCount[resolveQualityKey()]);
};

const setupDebugPanel = async () => {
  if (!debugEnabled) return;
  try {
    const { createDebugPanel } = await import("./background/debugPanel.js");
    const panel = createDebugPanel({
      tuning: TUNING,
      quality: resolveQualityKey(),
      apply: applyTuning,
      rebuild: rebuildSpeedLines,
    });
    if (disposed) panel.destroy();
    else debugPanel = panel;
  } catch (err) {
    console.warn("[GaussianSplatBackground] デバッグパネルを開けませんでした:", err);
  }
};

const injectShader = (source, anchor, replacement, label) => {
  if (!source.includes(anchor)) {
    console.warn(
      `[GaussianSplatBackground] シェーダのアンカーが見つかりません (${label}): ${anchor}`,
    );
    return source;
  }
  return source.replace(anchor, replacement);
};

const init = async () => {
  try {
    THREE = await import("three");
    SPARK = await import("@sparkjsdev/spark");

    basePos = new THREE.Vector3().fromArray(props.cameraPosition);
    lookTarget = new THREE.Vector3().fromArray(props.cameraLookAt);

    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    if (!renderer.getContext()) {
      throw new Error("WebGL is not available");
    }
    renderer.setClearColor(new THREE.Color(TUNING.bgColor), 1);
    renderer.setPixelRatio(resolvePixelRatio(w, h));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.NoToneMapping;
    container.value.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 500);
    camera.position.fromArray(props.cameraPosition);
    camera.lookAt(new THREE.Vector3().fromArray(props.cameraLookAt));

    scene = new THREE.Scene();

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    speedLines = createSpeedLines(THREE, {
      camera,
      tuning: TUNING,
      count: TUNING.lineCount[resolveQualityKey()],
      revealBand: REVEAL_BAND,
      motionless: prefersReducedMotion,
    });
    scene.add(speedLines.mesh);

    setupDebugPanel();

    animate();

    const loader = new SPARK.SplatLoader();

    await new Promise((resolve, reject) => {
      loader.load(
        props.splatPath,
        (packedSplats) => {
          if (disposed) {
            resolve();
            return;
          }

          const count = packedSplats.numSplats;

          const positions = new Float32Array(count * 3);
          const colors = new Float32Array(count * 3);
          const opacities = new Float32Array(count);

          let validPoints = 0;
          const minAlpha = props.alphaThreshold / 255.0;

          packedSplats.forEachSplat((index, center, scales, quaternion, opacity, color) => {
            if (opacity < Math.max(minAlpha, 0.05)) return;

            positions[validPoints * 3] = center.x;
            positions[validPoints * 3 + 1] = center.y;
            positions[validPoints * 3 + 2] = center.z;

            colors[validPoints * 3] = color.r;
            colors[validPoints * 3 + 1] = color.g;
            colors[validPoints * 3 + 2] = color.b;

            opacities[validPoints] = opacity;

            validPoints++;
          });

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions.subarray(0, validPoints * 3), 3),
          );
          geometry.setAttribute(
            "aColor",
            new THREE.BufferAttribute(colors.subarray(0, validPoints * 3), 3),
          );
          geometry.setAttribute(
            "aOpacity",
            new THREE.BufferAttribute(opacities.subarray(0, validPoints), 1),
          );

          const material = new THREE.PointsMaterial({
            size: props.pointSize * TUNING.pointSizeScale,
            sizeAttenuation: true,
            transparent: true,
            depthWrite: false,
            // MultiplyBlending は three r186 では premultipliedAlpha を要求する
            // (WebGLState.js の setBlending 参照) ので、CustomBlending で素直に組む。
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.DstColorFactor,
            blendDst: THREE.ZeroFactor,
            blendSrcAlpha: THREE.ZeroFactor,
            blendDstAlpha: THREE.OneFactor,
            toneMapped: false,
          });

          splatUniforms = {
            time: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uColorA: { value: new THREE.Color(TUNING.colorA) },
            uColorB: { value: new THREE.Color(TUNING.colorB) },
            uInkDensity: { value: TUNING.inkDensity },
            uSoftness: { value: TUNING.pointSoftness },
            uBrightnessMode: { value: Number(TUNING.brightnessMode) },
            uBrightnessInfluence: { value: TUNING.brightnessInfluence },
            uRepelStrength: { value: TUNING.repelStrength },
            uWobble: { value: TUNING.wobbleStrength },
            uRefPointPx: { value: TUNING.refPointPx },
            uFog: { value: new THREE.Vector2(TUNING.fogNear, TUNING.fogFar) },
            uRevealFront: { value: revealFront },
            uRevealBand: { value: REVEAL_BAND },
            uRevealRange: { value: new THREE.Vector2(0, 1) },
          };

          material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, splatUniforms);

            shader.vertexShader =
              `
              uniform float time;
              uniform vec2 uMouse;
              uniform vec3 uColorA;
              uniform vec3 uColorB;
              uniform float uInkDensity;
              uniform float uBrightnessMode;
              uniform float uBrightnessInfluence;
              uniform float uRepelStrength;
              uniform float uWobble;
              uniform float uRefPointPx;
              uniform vec2 uFog;
              uniform float uRevealFront;
              uniform float uRevealBand;
              uniform vec2 uRevealRange;
              attribute float aOpacity;
              attribute vec3 aColor;
              varying vec3 vInk;
              varying float vStrength;
            \n` + shader.vertexShader;

            shader.vertexShader = injectShader(
              shader.vertexShader,
              "#include <begin_vertex>",
              `
              vec3 transformed = vec3(position);

              float brightness = clamp(dot(aColor, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);

              float wobbleAmount = pow(brightness, 4.0) * uWobble;
              transformed.x += sin(position.y * 10.0 + time * 1.2) * wobbleAmount;
              transformed.y += cos(position.x * 10.0 + time * 1.5) * wobbleAmount;
              transformed.z += sin(position.z * 10.0 + time * 1.3) * wobbleAmount;

              vec4 inkViewPos = modelViewMatrix * vec4(transformed, 1.0);
              vec4 ndcPos = projectionMatrix * inkViewPos;
              vec2 screenPos = ndcPos.xy / ndcPos.w;
              float distToMouse = distance(screenPos, uMouse);
              float repulsionRadius = 0.3;
              if (distToMouse < repulsionRadius) {
                float force = (repulsionRadius - distToMouse) / repulsionRadius;
                vec2 dir = normalize(screenPos - uMouse);
                transformed.xy += dir * force * uRepelStrength;
                transformed.z += force * uRepelStrength * 0.5;
              }

              float mixFactor = sin(position.y * 3.0 + time) * 0.5 + 0.5;
              vInk = mix(uColorA, uColorB, mixFactor);

              float tone = mix(1.0 - brightness, brightness, uBrightnessMode);
              float density = mix(1.0, tone, uBrightnessInfluence);

              float viewDepth = -inkViewPos.z;
              float fog = 1.0 - smoothstep(uFog.x, max(uFog.y, uFog.x + 1e-3), viewDepth);

              float viewDist = length((modelViewMatrix * vec4(position, 1.0)).xyz);
              float revealT = clamp(
                (log(max(viewDist, 1e-3)) - uRevealRange.x) / max(uRevealRange.y - uRevealRange.x, 1e-3),
                0.0, 1.0
              );
              float passed = clamp((uRevealFront - revealT) / max(uRevealBand, 1e-3), 0.0, 1.0);
              float reveal = 1.0 - (1.0 - passed) * (1.0 - passed);

              vStrength = uInkDensity * density * (0.4 + aOpacity * 0.6) * fog * reveal;
              `,
              "vertex/begin_vertex",
            );

            // gl_PointSize はサイズ減衰まで含めて <logdepthbuf_vertex> の直前で確定するので、
            // そこに差し込む (points.glsl.js の gl_PointSize ブロックの直後)。
            shader.vertexShader = injectShader(
              shader.vertexShader,
              "#include <logdepthbuf_vertex>",
              `
              if (uRefPointPx > 0.0) {
                vStrength *= min(1.0, pow(uRefPointPx / max(gl_PointSize, 1.0), 2.0));
              }

              #include <logdepthbuf_vertex>
              `,
              "vertex/logdepthbuf_vertex",
            );

            shader.fragmentShader =
              `
              uniform float uSoftness;
              varying vec3 vInk;
              varying float vStrength;
            \n` + shader.fragmentShader;

            // <opaque_fragment> は gl_FragColor を組み立てる唯一の場所で、この後の
            // <colorspace_fragment> で出力色空間へ変換されるため、ここで差し替えるのが一番素直。
            shader.fragmentShader = injectShader(
              shader.fragmentShader,
              "#include <opaque_fragment>",
              `
              float pointDist = length(gl_PointCoord - vec2(0.5));
              // smoothstep は edge0 >= edge1 が未定義 (GPU によっては点が全消えする) ので、
              // uSoftness = 0 でも内外の縁が必ず離れるようにクランプする
              float inner = min(0.5 * (1.0 - clamp(uSoftness, 0.0, 1.0)), 0.499);
              float shape = 1.0 - smoothstep(inner, 0.5, pointDist);
              if (shape <= 0.0) discard;

              float ink = clamp(vStrength * shape, 0.0, 1.0);
              gl_FragColor = vec4(mix(vec3(1.0), vInk, ink), 1.0);
              `,
              "fragment/opaque_fragment",
            );
          };

          splatMesh = new THREE.Points(geometry, material);
          splatMesh.renderOrder = 1;

          splatMesh.quaternion.fromArray(props.sceneRotation);
          splatMesh.position.fromArray(props.scenePosition);
          splatMesh.scale.fromArray(props.sceneScale);

          const revealRange = measureRevealRange(positions, validPoints);
          splatUniforms.uRevealRange.value.set(revealRange.near, revealRange.far);
          speedLines?.setRevealRange(revealRange.near, revealRange.far);

          scene.add(splatMesh);
          console.log(
            "[GaussianSplatBackground] PointCloud created with points:",
            validPoints,
            "from original:",
            count,
          );
          resolve();
        },
        (xhr) => {
          if (xhr.total > 0) {
            progress.value = (xhr.loaded / xhr.total) * 100;
          } else {
            progress.value = Math.min((xhr.loaded / 30000000) * 100, 99);
          }
          emit("progress", progress.value);
        },
        (err) => {
          reject(err);
        },
      );
    });

    if (disposed) return;
    status.value = "ready";
    emit("loaded");
  } catch (err) {
    if (disposed) return;
    fail(err);
  }
};

let lastTime = 0;
let targetFps = ACTIVE_FPS;
// rAF intervals jitter around the display's frame time; without a tolerance a 16.6ms frame
// on a 60Hz display fails a "< 16.67ms" check and gets dropped (uneven ~45fps)
const FRAME_TOLERANCE_MS = 2;

const updateCameraInfo = () => {
  if (!camera) return;
  camPos.value.x = camera.position.x.toFixed(2);
  camPos.value.y = camera.position.y.toFixed(2);
  camPos.value.z = camera.position.z.toFixed(2);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  camDir.value.x = dir.x.toFixed(2);
  camDir.value.y = dir.y.toFixed(2);
  camDir.value.z = dir.z.toFixed(2);
};

const animate = (time = 0) => {
  animationId = requestAnimationFrame(animate);
  if (time - lastTime < 1000 / targetFps - FRAME_TOLERANCE_MS) return;
  const dt = Math.min(time - lastTime, 100);
  lastTime = time;
  const frames = dt / (1000 / 60);
  const ease = (k) => 1 - Math.pow(1 - k, frames);

  if (camera && basePos && lookTarget) {
    const range = props.parallaxRange * TUNING.parallaxScale;
    const targetX = basePos.x + mouse.x * range;
    const targetY = basePos.y + mouse.y * range * 0.3;

    camera.position.x += (targetX - camera.position.x) * ease(0.05);
    camera.position.y += (targetY - camera.position.y) * ease(0.05);

    camera.lookAt(lookTarget);
  }

  smoothMouse.x += (mouse.x - smoothMouse.x) * ease(0.1);
  smoothMouse.y += (mouse.y - smoothMouse.y) * ease(0.1);

  if (props.reveal) {
    if (revealFront < 1 + REVEAL_BAND) {
      revealElapsed += dt;
      const p = Math.min(Math.max((revealElapsed - REVEAL_DELAY_MS) / REVEAL_DURATION_MS, 0), 1);
      revealFront = (1 - (1 - p) * (1 - p)) * (1 + REVEAL_BAND);
    } else {
      targetFps = TUNING.idleFps;
    }
  }

  if (splatUniforms) {
    splatUniforms.time.value = time / 1000;
    splatUniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y);
    splatUniforms.uRevealFront.value = revealFront;
  }

  speedLines?.update(dt, revealFront);

  renderer.render(scene, camera);

  if (status.value === "ready" && overlayEnabled.value) {
    updateCameraInfo();
  }
};

onMounted(() => init().catch(console.error));
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (animationId) cancelAnimationFrame(animationId);
  debugPanel?.destroy();
  debugPanel = null;
  if (speedLines) {
    scene?.remove(speedLines.mesh);
    speedLines.dispose();
    speedLines = null;
  }
  if (splatMesh) {
    scene?.remove(splatMesh);
    splatMesh.geometry.dispose();
    splatMesh.material.dispose();
    splatMesh = null;
  }
  splatUniforms = null;
  renderer?.dispose();
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

.camera-info-overlay {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgb(var(--color-shadow-rgb) / 0.7);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--color-primary);
  color: var(--color-text-on-dark);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1rem;
  pointer-events: none;
  z-index: 101;
}

.info-row {
  display: flex;
  margin-bottom: 5px;
}

.info-row .label {
  width: 40px;
  opacity: 0.7;
}

.info-row .value {
  font-weight: bold;
}

.info-hint {
  margin-top: 10px;
  font-size: 0.8rem;
  color: var(--color-error);
  opacity: 0.9;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-overlay);
}

.loading-text,
.error-text {
  font-family: var(--font-latin);
  font-size: 0.9rem;
  color: var(--color-primary-text);
}

.error-text {
  color: var(--color-error);
}

.fade-leave-active {
  transition: opacity 0.8s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
