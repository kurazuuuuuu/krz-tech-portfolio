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

    <!-- Camera Position/Direction Overlay (?debug のときだけ) -->
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

// ---- チューニング値 ------------------------------------------------
// `?debug` パネルで調整できる項目の既定値。パネルの「値をコピー」が吐く JSON と
// キーが 1 対 1 で対応しているので、気に入った値はそのままここへ貼り戻せる。
const TUNING = {
  // canvas の不透明クリア色。乗算ブレンドは「描画バッファの色」に掛けるので、
  // 背景が透過だと掛ける相手が居らず真っ黒になる。必ず body の背景色と揃えること。
  bgColor: "#f3fbf6",
  // リビール完了後のフレームレート。線が流れ続けるのでカクつきが気になるなら 60 に上げる
  // (その分 GPU を食う)。動かない点群だけなら 30 で十分。
  idleFps: 30,

  // ---- 点群 (インク) ----
  // 1 点あたりの染まり具合。この splat は 1px あたりの重なりが平均 1.1 (q99 でも 7) と薄いので、
  // 小さくすると何も見えない。黒潰れの心配より「見えるか」を優先して高めに取る。
  inkDensity: 1,
  pointSizeScale: 1.5, // props.pointSize に掛かる倍率
  pointSoftness: 0.6, // 0 = 硬い円, 1 = 中心から放射状に減衰
  colorA: "#4fcf72", // ビビッドグリーン
  colorB: "#9fe3b4", // ミント寄りの緑
  brightnessMode: 1, // 1 = 明るい点ほど濃い / 0 = 暗い点ほど濃い
  brightnessInfluence: 0.7,
  // フォグはビュー空間の線形深度 (カメラからの奥行き、ワールド単位)。
  // NDC 深度は near 0.1 / far 500 だと 1.0 付近に貼り付いて実質効かないため使わない。
  fogNear: 6,
  fogFar: 45,
  // 手前の大粒だけが濃くなりすぎるのを抑える基準サイズ (描画バッファ px)。
  // これより大きい点は面積比で濃度を落とす。0 以下で無効。
  refPointPx: 3.5,
  repelStrength: 0.005, // マウス斥力。前面の DOM が主役なので、気づく程度のごく弱い反応に留める
  wobbleStrength: 0.01,
  parallaxScale: 1.0, // props.parallaxRange に掛かる倍率

  // ---- スピード線 ----
  lineCount: { high: 50, medium: 24, low: 12 },
  // DOM 側の斜め帯と揃えるため CSS と同じ符号 (負 = 右上がり) で持つ
  lineAngleDeg: -12,
  lineAngleJitterDeg: 3,
  // 長さ・太さ・速度は「その奥行きでの画面高さ」に対する比。遠近に依らず見た目の大きさが揃う
  lineLengthMin: 0.12,
  lineLengthMax: 0.45,
  lineWidthMin: 0.0015,
  lineWidthMax: 0.01,
  lineSpeedMin: 0.02,
  lineSpeedMax: 0.07,
  lineDepthNear: 0.6, // カメラからの配置距離
  lineDepthFar: 6.0,
  // 線もビュー空間の線形深度。配置距離 0.6〜6 に合わせた範囲
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

// ---- Props --------------------------------------------------------
const props = defineProps({
  // Path to your .ply / .spz / .splat / .ksplat file under /public
  splatPath: {
    type: String,
    default: "/scene.ply",
  },
  // Initial camera position in the 3DGS scene's coordinate space
  cameraPosition: {
    type: Array,
    default: () => [0, -2, 5],
  },
  // What point the camera looks at initially
  cameraLookAt: {
    type: Array,
    default: () => [0, 0, 0],
  },
  // How many world-units the camera drifts on full mouse movement (parallax)
  parallaxRange: {
    type: Number,
    default: 0.1,
  },
  // Alpha threshold – splats below this value are discarded (0-255)
  alphaThreshold: {
    type: Number,
    default: 5, // Kept for prop parity, though SPARK uses opacity in shader
  },
  // Spherical harmonics degree (0=fastest, 1/2=more view-dependent colour)
  shDegree: {
    type: Number,
    default: 1,
  },
  // Point Size (for PointCloud mode)
  pointSize: {
    type: Number,
    default: 0.012,
  },
  // Scene Rotation (Quaternion format: [x, y, z, w])
  sceneRotation: {
    type: Array,
    default: () => [0, 0, 0, 1],
  },
  // Scene Position offset
  scenePosition: {
    type: Array,
    default: () => [0, 0, 0],
  },
  // Scene Scale
  sceneScale: {
    type: Array,
    default: () => [1, 1, 1],
  },
  // Quality preset: 'high', 'medium', 'low'
  quality: {
    type: String,
    default: "medium",
  },
  // true になった時点から点群を手前→奥へリビールする (イントロが閉じた合図)
  reveal: {
    type: Boolean,
    default: true,
  },
});

// ---- Emits --------------------------------------------------------
// - "progress": download progress 0-100 (drives the intro loading line)
// - "loaded": fired once loading finished (success OR failure), so a parent
//   (e.g. the intro animation) can stop waiting on the 3DGS asset.
const emit = defineEmits(["loaded", "progress", "error"]);

// ---- State --------------------------------------------------------
const container = ref(null);
const status = ref("loading"); // 'loading' | 'ready' | 'error'
const progress = ref(0);

// URL に ?debug が付いているときだけ、lil-gui の調整パネルとカメラ座標オーバーレイを出す
const debugEnabled =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
const overlayEnabled = ref(debugEnabled);

// Mouse parallax state
const mouse = { x: 0, y: 0 };
// Smooth mouse for shader interactions
const smoothMouse = { x: 0, y: 0 };
let basePos = null;
let lookTarget = null;

// Camera info for overlay
const camPos = ref({ x: "0.00", y: "0.00", z: "0.00" });
const camDir = ref({ x: "0.00", y: "0.00", z: "0.00" });

// ---- Internals ----------------------------------------------------
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
// アンマウント済みフラグ。非同期処理 (splat ロード / デバッグパネルの import) が
// アンマウント後に着地したとき、GPU リソースを宙に浮かせないために見る
let disposed = false;

// ---- GPU load control ---------------------------------------------
// 描画ピクセル数の予算。塗り面積 (= 解像度) に比例して重くなるため、
// 4K などの高解像度モニターでは pixelRatio を下げてこの範囲に収める (約 1080p x 1.4 相当)。
// 点はもともとソフトなので、解像度を多少落としても見た目の劣化は小さい。
const MAX_RENDER_PIXELS = 4_000_000;
// リビール中は 60fps。完了後は TUNING.idleFps へ落とす
const ACTIVE_FPS = 60;

const resolvePixelRatio = (w, h) => {
  const maxPixelRatio = props.quality === "high" ? 2 : props.quality === "low" ? 1 : 1.5;
  const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / Math.max(w * h, 1));
  return Math.min(window.devicePixelRatio, maxPixelRatio, budgetRatio);
};

// quality prop は任意の文字列を取りうるので、TUNING に無いキーは medium に丸める
const resolveQualityKey = () =>
  TUNING.lineCount[props.quality] === undefined ? "medium" : props.quality;

// ---- Point cloud reveal (手前→奥へ波面が走る) ----------------------
const REVEAL_DURATION_MS = 2500;
// イントロの白オーバーレイがフェードアウトする間 (0.4s) は見えないので少し待つ
const REVEAL_DELAY_MS = 300;
// 波面の厚み (正規化した log 距離 0-1 に対する割合)。帯の中で点が濃度 0 から通常へ立ち上がる
const REVEAL_BAND = 0.25;
const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// reveal が true になってからの経過時間 (タブ非表示中は進めない)
let revealElapsed = 0;
// 波面の先端位置。点群とスピード線で同じ値を共有して登場を同期させる
let revealFront = prefersReducedMotion ? 1 + REVEAL_BAND : 0;

// カメラから見える点の距離分布 (log) を間引きサンプルで実測し、波面の走査範囲を決める。
// 透視投影では遠方ほど画面上で密になるため、log 距離で走らせると見た目の速度が均一になる。
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
    // 画面内 (少し余裕を持たせる) かつ near/far の間にある点だけを対象にする
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

// ---- Event Listeners ----------------------------------------------
const onResize = () => {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Re-evaluate the pixel budget (window may have moved to a different monitor)
  renderer.setPixelRatio(resolvePixelRatio(w, h));
  renderer.setSize(w, h);
  // 画面の形が大きく変わったときだけ、スピード線の散らばりを作り直す
  speedLines?.handleResize();
};

const onMouseMove = (e) => {
  // Normalize mouse coordinates to -1 ... 1
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
};

// Pause the render loop while the tab is hidden to save GPU/battery
const onVisibilityChange = () => {
  if (document.hidden) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if (!animationId) {
    // Reset the clock so the loop doesn't jump after a long pause
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

// ---- チューニング値の反映 ------------------------------------------
// uniform だけで効く項目。線のインスタンス属性に焼き込む項目は rebuildSpeedLines 側。
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

// ?debug のときだけ lil-gui を動的 import する (本番の初期ロードには乗らない)
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
    // import を待っている間にアンマウントされていたら、その場で畳む
    if (disposed) panel.destroy();
    else debugPanel = panel;
  } catch (err) {
    console.warn("[GaussianSplatBackground] デバッグパネルを開けませんでした:", err);
  }
};

// three のシェーダは版によってアンカー文字列が変わる。空振りに気付かず
// 機能が黙って消えるのを防ぐため、見つからなければ警告を出す。
const injectShader = (source, anchor, replacement, label) => {
  if (!source.includes(anchor)) {
    console.warn(
      `[GaussianSplatBackground] シェーダのアンカーが見つかりません (${label}): ${anchor}`,
    );
    return source;
  }
  return source.replace(anchor, replacement);
};

// ---- Init ---------------------------------------------------------
const init = async () => {
  try {
    THREE = await import("three");
    SPARK = await import("@sparkjsdev/spark");

    basePos = new THREE.Vector3().fromArray(props.cameraPosition);
    lookTarget = new THREE.Vector3().fromArray(props.cameraLookAt);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Standard THREE.js Setup
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    if (!renderer.getContext()) {
      throw new Error("WebGL is not available");
    }
    // 点群は乗算ブレンドなので、透過クリアだと掛ける相手が居ない。
    // 背景色で不透明にクリアし、canvas の中で乗算が完結するようにする。
    renderer.setClearColor(new THREE.Color(TUNING.bgColor), 1);
    // Pixel ratio is capped by quality AND by an absolute pixel budget (see MAX_RENDER_PIXELS)
    renderer.setPixelRatio(resolvePixelRatio(w, h));
    renderer.setSize(w, h);
    // トーンマッピングは有効だと乗算係数まで曲げてしまう (白 1.0 が 1.0 でなくなる) ので使わない
    renderer.toneMapping = THREE.NoToneMapping;
    container.value.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 500); // Changed FOV from 60 to 50 for a 1.2x zoom
    camera.position.fromArray(props.cameraPosition);
    camera.lookAt(new THREE.Vector3().fromArray(props.cameraLookAt));

    scene = new THREE.Scene();

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 空間に散らすスピード線 (点群のグループとは独立に、カメラ基準で配置する)
    speedLines = createSpeedLines(THREE, {
      camera,
      tuning: TUNING,
      count: TUNING.lineCount[resolveQualityKey()],
      revealBand: REVEAL_BAND,
      motionless: prefersReducedMotion,
    });
    scene.add(speedLines.mesh);

    setupDebugPanel();

    // Start the render loop immediately
    animate();

    // Load the 3DGS model using SPARK
    const loader = new SPARK.SplatLoader();

    await new Promise((resolve, reject) => {
      loader.load(
        props.splatPath,
        (packedSplats) => {
          // アンマウント後に着地した場合。ここで点群を組むと誰も破棄できなくなるので、
          // 何も作らずに抜ける (この時点では自前のリソースはまだ 1 つも無い)
          if (disposed) {
            resolve();
            return;
          }

          // Splat loaded and parsed, now construct the point cloud
          const count = packedSplats.numSplats;

          // Pre-allocate buffers
          const positions = new Float32Array(count * 3);
          const colors = new Float32Array(count * 3);
          // Repurpose per-splat opacity the PointCloud would otherwise discard -> ink strength.
          // (Point SIZE is kept uniform on purpose to preserve the crisp "dot" look.)
          const opacities = new Float32Array(count);

          let validPoints = 0;
          const minAlpha = props.alphaThreshold / 255.0;

          packedSplats.forEachSplat((index, center, scales, quaternion, opacity, color) => {
            // Drop points with extremely low opacity to save rendering vertex count
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
          // three の vertexColors 経路 (vColor) は使わず自前の属性で持つ。
          // 乗算では最終色を自分で組み立てるので、途中で勝手に掛けられると困るため。
          geometry.setAttribute(
            "aColor",
            new THREE.BufferAttribute(colors.subarray(0, validPoints * 3), 3),
          );
          geometry.setAttribute(
            "aOpacity",
            new THREE.BufferAttribute(opacities.subarray(0, validPoints), 1),
          );

          // インクの点群。加算 (光) ではなく乗算 (インク) なので、重なるほど背景が緑に沈む。
          // 乗算は加算と同じく描画順に依存しないので、ソート無しの軽さは保てる。
          const material = new THREE.PointsMaterial({
            size: props.pointSize * TUNING.pointSizeScale,
            sizeAttenuation: true,
            // transparent: true で透明キューへ送り、不透明なスピード線より後に描かせる
            transparent: true,
            depthWrite: false,
            // MultiplyBlending は three r186 では premultipliedAlpha を要求する
            // (WebGLState.js の setBlending 参照) ので、CustomBlending で素直に組む。
            //   色: src * DST_COLOR + dst * ZERO = src * dst  (= 乗算)
            //   α : src * ZERO + dst * ONE      = dst        (背景の不透明度を壊さない)
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.DstColorFactor,
            blendDst: THREE.ZeroFactor,
            blendSrcAlpha: THREE.ZeroFactor,
            blendDstAlpha: THREE.OneFactor,
            // 乗算係数はトーンマッピングしてはいけない (白 = 素通しでなくなる)
            toneMapped: false,
          });

          // wobble / マウス斥力 / イリデッセンス / Depth Fog / リビール波面を差し込む
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
            // Reveal wave: front position in normalized log-distance (0 .. 1 + REVEAL_BAND)
            uRevealFront: { value: revealFront },
            uRevealBand: { value: REVEAL_BAND },
            uRevealRange: { value: new THREE.Vector2(0, 1) }, // (log near, log far)
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

            // Replace the position transform logic to inject wobble & mouse repulsion
            shader.vertexShader = injectShader(
              shader.vertexShader,
              "#include <begin_vertex>",
              `
              vec3 transformed = vec3(position);

              // 1. 元の splat 色の輝度。wobble の強さとインクの濃さに使う
              float brightness = clamp(dot(aColor, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);

              // 2. wobble: 位置から位相をずらして有機的に揺らす
              float wobbleAmount = pow(brightness, 4.0) * uWobble;
              transformed.x += sin(position.y * 10.0 + time * 1.2) * wobbleAmount;
              transformed.y += cos(position.x * 10.0 + time * 1.5) * wobbleAmount;
              transformed.z += sin(position.z * 10.0 + time * 1.3) * wobbleAmount;

              // 3. マウス斥力: 画面座標でおおまかに押しのける
              vec4 inkViewPos = modelViewMatrix * vec4(transformed, 1.0);
              vec4 ndcPos = projectionMatrix * inkViewPos;
              vec2 screenPos = ndcPos.xy / ndcPos.w;
              float distToMouse = distance(screenPos, uMouse);
              float repulsionRadius = 0.3;
              if (distToMouse < repulsionRadius) {
                float force = (repulsionRadius - distToMouse) / repulsionRadius;
                vec2 dir = normalize(screenPos - uMouse);
                transformed.xy += dir * force * uRepelStrength;
                transformed.z += force * uRepelStrength * 0.5; // Slightly push back
              }

              // 4. イリデッセンス: 緑の 2 トーンを時間でゆっくり行き来させる
              float mixFactor = sin(position.y * 3.0 + time) * 0.5 + 0.5;
              vInk = mix(uColorA, uColorB, mixFactor);

              // 5. 輝度 -> 濃度。乗算では「濃い = 背景を強く染める」で意味が反転するため、
              //    どちらを濃くするかは uBrightnessMode (1 = 明るい所, 0 = 暗い所) で切り替える。
              float tone = mix(1.0 - brightness, brightness, uBrightnessMode);
              float density = mix(1.0, tone, uBrightnessInfluence);

              // 6. Depth Fog: 遠いほど濃度 0 = 背景色に溶ける。
              //    NDC 深度は near 0.1 / far 500 だと 1.0 付近に貼り付いて効かないので、
              //    ビュー空間の線形深度 (カメラからの奥行き) を使う。
              float viewDepth = -inkViewPos.z;
              float fog = 1.0 - smoothstep(uFog.x, max(uFog.y, uFog.x + 1e-3), viewDepth);

              // 7. リビール波面 (手前 -> 奥)。log 距離で正規化して走査速度を均一にする
              float viewDist = length((modelViewMatrix * vec4(position, 1.0)).xyz);
              float revealT = clamp(
                (log(max(viewDist, 1e-3)) - uRevealRange.x) / max(uRevealRange.y - uRevealRange.x, 1e-3),
                0.0, 1.0
              );
              float passed = clamp((uRevealFront - revealT) / max(uRevealBand, 1e-3), 0.0, 1.0);
              // 乗算 + sRGB 出力だと濃度に対する見た目の変化が後ろ重い (濃い側ほど変化が速い)。
              // 帯の中は ease-out で前倒しし、体感の立ち上がりを均す。
              float reveal = 1.0 - (1.0 - passed) * (1.0 - passed);

              // 円形アルファ以外をまとめておく (円形分はフラグメントで掛ける)
              vStrength = uInkDensity * density * (0.4 + aOpacity * 0.6) * fog * reveal;
              `,
              "vertex/begin_vertex",
            );

            // 純粋な乗算では dst を読めないので「濃くなりすぎたら止める」下限クランプが作れない。
            // 代わりに、手前の大粒 (= 塗り面積が大きい点) だけ面積比で濃度を落として保険にする。
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

            // 乗算ブレンドなのでフラグメントの出力色は「背景に掛ける係数」。
            // 白 (1,1,1) = 素通し、色が濃いほど強く染まる。アルファは使わず色だけで効き具合を決める。
            // <opaque_fragment> は gl_FragColor を組み立てる唯一の場所で、この後の
            // <colorspace_fragment> で出力色空間へ変換されるため、ここで差し替えるのが一番素直。
            shader.fragmentShader = injectShader(
              shader.fragmentShader,
              "#include <opaque_fragment>",
              `
              // 柔らかい円形の減衰 (旧: 円テクスチャ)
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
          // 不透明なスピード線 (renderOrder 0) の後に描く
          splatMesh.renderOrder = 1;

          // Apply user transformations
          splatMesh.quaternion.fromArray(props.sceneRotation);
          splatMesh.position.fromArray(props.scenePosition);
          splatMesh.scale.fromArray(props.sceneScale);

          const revealRange = measureRevealRange(positions, validPoints);
          splatUniforms.uRevealRange.value.set(revealRange.near, revealRange.far);
          // スピード線も同じ log 距離の物差しで登場させる
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
          // Update progress bar
          if (xhr.total > 0) {
            progress.value = (xhr.loaded / xhr.total) * 100;
          } else {
            // For chunks without total length header
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

// ---- Render loop --------------------------------------------------
let lastTime = 0;
// 60fps during the reveal, then TUNING.idleFps once the scene has settled
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
  // Clamp so a long pause (hidden tab) doesn't make the reveal jump ahead
  const dt = Math.min(time - lastTime, 100);
  lastTime = time;
  // Per-frame easing factors were tuned at 60fps; rescale so motion is frame-rate independent
  const frames = dt / (1000 / 60);
  const ease = (k) => 1 - Math.pow(1 - k, frames);

  // Apply parallax logic if camera is available
  if (camera && basePos && lookTarget) {
    const range = props.parallaxRange * TUNING.parallaxScale;
    // Reduce Y-axis parallax by half to keep the horizon stable
    const targetX = basePos.x + mouse.x * range;
    const targetY = basePos.y + mouse.y * range * 0.3;

    // Smoothly interpolate current camera position toward target position
    camera.position.x += (targetX - camera.position.x) * ease(0.05);
    camera.position.y += (targetY - camera.position.y) * ease(0.05);

    // Always keep looking at the central target
    camera.lookAt(lookTarget);
  }

  // Smooth mouse calculation for shaders so the repulsion isn't jittery
  smoothMouse.x += (mouse.x - smoothMouse.x) * ease(0.1);
  smoothMouse.y += (mouse.y - smoothMouse.y) * ease(0.1);

  // Advance the reveal wave once the intro has closed (easeOutQuad: bursts out, then settles).
  // 点群の有無に依らず 1 つの時計で進めるので、点とスピード線の登場が必ず同期する。
  if (props.reveal) {
    if (revealFront < 1 + REVEAL_BAND) {
      revealElapsed += dt;
      const p = Math.min(Math.max((revealElapsed - REVEAL_DELAY_MS) / REVEAL_DURATION_MS, 0), 1);
      revealFront = (1 - (1 - p) * (1 - p)) * (1 + REVEAL_BAND);
    } else {
      // GUI から変えられるよう毎フレーム読み直す
      targetFps = TUNING.idleFps;
    }
  }

  // Update custom shader uniforms
  if (splatUniforms) {
    splatUniforms.time.value = time / 1000;
    splatUniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y);
    splatUniforms.uRevealFront.value = revealFront;
  }

  // Ensure SPARK's own updates occur if necessary (skipped for PointCloud)
  if (splatMesh && typeof splatMesh.update === "function") {
    splatMesh.update({ time: time / 1000, viewToWorld: camera.matrixWorld, globalEdits: [] });
  }

  // スピード線を流す (dt ベースなので IDLE 30fps でも速さは変わらない)
  speedLines?.update(dt, revealFront);

  renderer.render(scene, camera);

  if (status.value === "ready" && overlayEnabled.value) {
    updateCameraInfo();
  }
};

// ---- Lifecycle ----------------------------------------------------
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
    // THREE.Points has no dispose(); release its geometry/material instead
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
  z-index: -1; /* Sent to back as a background */
  pointer-events: none; /* Let clicks pass through to the real UI */
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
  /* 座標が桁で揺れないよう HUD は等幅にする */
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1rem;
  pointer-events: none; /* Let clicks pass through */
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
