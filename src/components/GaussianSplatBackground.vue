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

    <!-- Camera Position/Direction Overlay -->
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
const overlayEnabled = ref(false); // Turned off for production

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
let animationId = null;
let THREE = null;
let SPARK = null;
let glassShards = [];
let renderTarget = null; // Offscreen buffer for screen-space refraction
let glassUniforms = null; // Shared uniforms for glass shader

// Refraction is blurred by the distortion anyway, so a half-res background
// buffer cuts Pass-1 fill rate to ~1/4 with no visible quality loss.
const REFRACTION_SCALE = 0.5;

// ---- GPU load control ---------------------------------------------
// 描画ピクセル数の予算。加算ブレンドの点群は塗り面積 (= 解像度) に比例して重くなるため、
// 4K などの高解像度モニターでは pixelRatio を下げてこの範囲に収める (約 1080p x 1.4 相当)。
// 発光する点はもともとソフトなので、解像度を多少落としても見た目の劣化は小さい。
const MAX_RENDER_PIXELS = 4_000_000;
// リビール完了後の背景のゆらぎは 30fps で十分
const ACTIVE_FPS = 60;
const IDLE_FPS = 30;

const resolvePixelRatio = (w, h) => {
  const maxPixelRatio = props.quality === "high" ? 2 : props.quality === "low" ? 1 : 1.5;
  const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / Math.max(w * h, 1));
  return Math.min(window.devicePixelRatio, maxPixelRatio, budgetRatio);
};

// gl_FragCoord は描画バッファの実ピクセル座標なので、0-1 の UV にするには実サイズで割る
const updateGlassResolution = () => {
  if (!glassUniforms || !renderer) return;
  renderer.getDrawingBufferSize(glassUniforms.resolution.value);
};

// ---- Point cloud reveal (手前→奥へ波面が走る) ----------------------
const REVEAL_DURATION_MS = 2500;
// イントロの白オーバーレイがフェードアウトする間 (0.4s) は見えないので少し待つ
const REVEAL_DELAY_MS = 300;
// 波面の厚み (正規化した log 距離 0-1 に対する割合)。帯の中で点が輝度 0 から通常の明るさへ立ち上がる
const REVEAL_BAND = 0.25;
const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// reveal が true になってからの経過時間 (タブ非表示中は進めない)
let revealElapsed = 0;

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
  // Resize offscreen render target too (kept at reduced resolution)
  if (renderTarget)
    renderTarget.setSize(Math.round(w * REFRACTION_SCALE), Math.round(h * REFRACTION_SCALE));
  updateGlassResolution();
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
    renderer.setClearColor(0x000000, 0);
    // Pixel ratio is capped by quality AND by an absolute pixel budget (see MAX_RENDER_PIXELS)
    renderer.setPixelRatio(resolvePixelRatio(w, h));
    renderer.setSize(w, h);
    // Enable tone mapping for PBR glass material
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.value.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 500); // Changed FOV from 60 to 50 for a 1.2x zoom
    camera.position.fromArray(props.cameraPosition);
    camera.lookAt(new THREE.Vector3().fromArray(props.cameraLookAt));

    scene = new THREE.Scene();

    // Offscreen render target for screen-space refraction (half-res, see REFRACTION_SCALE)
    renderTarget = new THREE.WebGLRenderTarget(
      Math.round(w * REFRACTION_SCALE),
      Math.round(h * REFRACTION_SCALE),
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      },
    );

    // Add subtle ambient + directional lighting for glass highlights
    const ambientLight = new THREE.AmbientLight(0x7db87d, 0.3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2, 3, 1);
    scene.add(dirLight);

    // Generate glowing circle texture for holographic points
    const createCircleTexture = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const center = size / 2;

      const gradient = context.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      return new THREE.CanvasTexture(canvas);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Create glass shards scattered in the scene
    createGlassShards();

    // Start the render loop immediately
    animate();

    // Load the 3DGS model using SPARK
    const loader = new SPARK.SplatLoader();

    await new Promise((resolve, reject) => {
      loader.load(
        props.splatPath,
        (packedSplats) => {
          // Splat loaded and parsed, now construct the point cloud
          const count = packedSplats.numSplats;

          // Pre-allocate buffers
          const positions = new Float32Array(count * 3);
          const colors = new Float32Array(count * 3);
          // Repurpose per-splat opacity the PointCloud would otherwise discard -> glow strength.
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
          geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colors.subarray(0, validPoints * 3), 3),
          );
          geometry.setAttribute(
            "aOpacity",
            new THREE.BufferAttribute(opacities.subarray(0, validPoints), 1),
          );

          const circleTexture = createCircleTexture();

          // Hologram PointCloud material (Additive Blending + Glowing Spheres)
          const material = new THREE.PointsMaterial({
            size: props.pointSize * 1.5, // Slightly larger size since edges are now soft
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8, // Additive blending handles intensity, so we can raise base opacity
            depthWrite: false,
            blending: THREE.AdditiveBlending, // Makes overlapping points glow
            map: circleTexture, // Use the soft circle instead of harsh squares
            color: 0x7db87d, // Multiply the original colors with the cyber-green theme
          });

          // Add custom shader for brightness-wobble, depth fog, iridescence, and mouse repulsion
          const customUniforms = {
            time: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uCameraPos: { value: new THREE.Vector3() },
            uColorA: { value: new THREE.Color(0x7db87d) }, // Base cyber green
            uColorB: { value: new THREE.Color(0x42f5e3) }, // Cyan for iridescence
            // Reveal wave: front position in normalized log-distance (0 .. 1 + REVEAL_BAND)
            uRevealFront: { value: prefersReducedMotion ? 1 + REVEAL_BAND : 0 },
            uRevealBand: { value: REVEAL_BAND },
            uRevealRange: { value: new THREE.Vector2(0, 1) }, // (log near, log far)
          };

          material.onBeforeCompile = (shader) => {
            shader.uniforms.time = customUniforms.time;
            shader.uniforms.uMouse = customUniforms.uMouse;
            shader.uniforms.uCameraPos = customUniforms.uCameraPos;
            shader.uniforms.uColorA = customUniforms.uColorA;
            shader.uniforms.uColorB = customUniforms.uColorB;
            shader.uniforms.uRevealFront = customUniforms.uRevealFront;
            shader.uniforms.uRevealBand = customUniforms.uRevealBand;
            shader.uniforms.uRevealRange = customUniforms.uRevealRange;

            // Pass varying to fragment shader for colors
            shader.vertexShader =
              `
              uniform float time;
              uniform vec2 uMouse;
              uniform vec3 uCameraPos;
              uniform vec3 uColorA;
              uniform vec3 uColorB;
              uniform float uRevealFront;
              uniform float uRevealBand;
              uniform vec2 uRevealRange;
              attribute float aOpacity;
              varying vec3 vMixedColor;
              varying float vDepth;
              varying float vReveal;
            \n` + shader.vertexShader;

            // Replace the position transform logic to inject wobble & mouse repulsion
            shader.vertexShader = shader.vertexShader.replace(
              "#include <begin_vertex>",
              `
              vec3 transformed = vec3(position);
              
              // 1. Calculate luminance from vertex color
              float brightness = dot(color, vec3(0.299, 0.587, 0.114));
              float wobbleAmount = pow(max(brightness, 0.0), 4.0) * 0.01; 
              
              // 2. Phase offsets based on position for organic movement
              float phaseX = position.y * 10.0 + time * 1.2;
              float phaseY = position.x * 10.0 + time * 1.5;
              float phaseZ = position.z * 10.0 + time * 1.3;
              
              transformed.x += sin(phaseX) * wobbleAmount;
              transformed.y += cos(phaseY) * wobbleAmount;
              transformed.z += sin(phaseZ) * wobbleAmount;

              // 3. Mouse Repulsion
              // Project the 3D position to 2D screen space roughly to interact with mouse
              vec4 ndcPos = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
              vec2 screenPos = ndcPos.xy / ndcPos.w;
              
              float distToMouse = distance(screenPos, uMouse);
              float repulsionRadius = 0.3;
              if(distToMouse < repulsionRadius) {
                 float force = (repulsionRadius - distToMouse) / repulsionRadius;
                 // Push points away in XY plane relative to mouse
                 vec2 dir = normalize(screenPos - uMouse);
                 transformed.x += dir.x * force * 0.1;
                 transformed.y += dir.y * force * 0.1;
                 transformed.z += force * 0.05; // Slightly push back
              }

              // 4. Iridescence (Blend between uColorA and uColorB based on local Y position + time)
              float mixFactor = sin(position.y * 3.0 + time) * 0.5 + 0.5;
              // Modulate glow by the original splat opacity so denser structure reads brighter
              vMixedColor = mix(uColorA, uColorB, mixFactor) * brightness * 2.0 * (0.4 + aOpacity * 0.6);
              
              // 5. Calculate Depth for Fog
              vDepth = ndcPos.z / ndcPos.w;

              // 6. Reveal wave (near -> far). "passed" is 0 ahead of the wave front and
              //    reaches 1 once the whole band has swept past this point.
              float viewDist = length((modelViewMatrix * vec4(position, 1.0)).xyz);
              float revealT = clamp(
                (log(max(viewDist, 1e-3)) - uRevealRange.x) / (uRevealRange.y - uRevealRange.x),
                0.0, 1.0
              );
              float passed = clamp((uRevealFront - revealT) / uRevealBand, 0.0, 1.0);
              // Brightness ramps from 0 up to the normal glow across the band (no overshoot)
              vReveal = smoothstep(0.0, 1.0, passed);
              `,
            );

            // Fragment Shader setup
            shader.fragmentShader =
              `
              varying vec3 vMixedColor;
              varying float vDepth;
              varying float vReveal;
            \n` + shader.fragmentShader;

            // Replace outgoing color logic to use mixed color and apply Depth Fog
            shader.fragmentShader = shader.fragmentShader
              .replace(
                "vec4 diffuseColor = vec4( diffuse, opacity );",
                `
              // vReveal: hidden (0) until the reveal wave reaches this point, then ramps to 1
              vec4 diffuseColor = vec4( vMixedColor, opacity * vReveal );
              `,
              )
              .replace(
                // NOTE: the points shader has no <dithering_fragment>; hook the last include instead
                "#include <premultiplied_alpha_fragment>",
                `
              // Depth Fog calculation (fade out points extremely far or extremely close)
              float fogNear = 0.5;
              float fogFar = 2.0;
              float fogFactor = smoothstep(fogNear, fogFar, vDepth);
              gl_FragColor.a *= (1.0 - fogFactor); // Fade out distant points

              #include <premultiplied_alpha_fragment>
              `,
              );
          };

          splatMesh = new THREE.Points(geometry, material);
          splatMesh.userData.uniforms = customUniforms;

          // Apply user transformations
          splatMesh.quaternion.fromArray(props.sceneRotation);
          splatMesh.position.fromArray(props.scenePosition);
          splatMesh.scale.fromArray(props.sceneScale);

          const revealRange = measureRevealRange(positions, validPoints);
          customUniforms.uRevealRange.value.set(revealRange.near, revealRange.far);

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

    status.value = "ready";
    emit("loaded");
  } catch (err) {
    fail(err);
  }
};

// ---- Glass Shards (Screen-Space Refraction) ----------------------
const createGlassShards = () => {
  const shardCount = 50;

  // Shared uniforms for all glass shards
  glassUniforms = {
    tBackground: { value: renderTarget.texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    time: { value: 0 },
  };
  updateGlassResolution();

  const glassMaterial = new THREE.ShaderMaterial({
    uniforms: glassUniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalMatrix * normal;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D tBackground;
      uniform vec2 resolution;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec2 screenUV = gl_FragCoord.xy / resolution;

        // Refraction distortion based on surface normal
        vec3 normal = normalize(vNormal);
        float distortionStrength = 0.5;
        vec2 distortion = normal.xy * distortionStrength;

        // Strong chromatic aberration: R/G/B sampled at widely separated offsets
        float r = texture2D(tBackground, screenUV + distortion * 1.3).r;
        float g = texture2D(tBackground, screenUV + distortion * 0.7).g;
        float b = texture2D(tBackground, screenUV + distortion * 0.2).b;
        vec3 refractedColor = vec3(r, g, b);

        // Fresnel effect (edges glow brighter)
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.0);

        // Glass tint (subtle green-cyan)
        vec3 glassTint = vec3(0.4, 0.85, 0.7);
        vec3 edgeGlow = glassTint * fresnel * 0.6;

        // Combine: refracted background + edge highlight
        vec3 finalColor = refractedColor + edgeGlow;

        // Alpha: mostly transparent center, glowing edges
        float alpha = 0.15 + fresnel * 0.5;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  for (let i = 0; i < shardCount; i++) {
    // Create random triangular shard geometry
    const geometry = new THREE.BufferGeometry();
    const scale = 0.05 + Math.random() * 0.15;
    const vertices = new Float32Array([
      (Math.random() - 0.5) * scale,
      (Math.random() - 0.3) * scale * 1.5,
      (Math.random() - 0.5) * scale * 0.3,
      (Math.random() - 0.5) * scale,
      (Math.random() + 0.2) * scale * 1.5,
      (Math.random() - 0.5) * scale * 0.3,
      (Math.random() + 0.3) * scale,
      (Math.random() - 0.5) * scale * 1.5,
      (Math.random() - 0.5) * scale * 0.3,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const shard = new THREE.Mesh(geometry, glassMaterial);
    shard.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.3) * 0.8,
      -0.3 - Math.random() * 2.5,
    );
    shard.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    shard.userData = {
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.4,
        z: (Math.random() - 0.5) * 0.2,
      },
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.4,
      floatAmplitude: 0.005 + Math.random() * 0.01,
      baseY: shard.position.y,
    };
    scene.add(shard);
    glassShards.push(shard);
  }
  console.log(
    "[GaussianSplatBackground] Created",
    shardCount,
    "glass shards with screen-space refraction",
  );
};

// ---- Render loop --------------------------------------------------
let lastTime = 0;
// 60fps during the reveal, then IDLE_FPS once the scene has settled
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
    // Reduce Y-axis parallax by half to keep the horizon stable
    const targetX = basePos.x + mouse.x * props.parallaxRange;
    const targetY = basePos.y + mouse.y * props.parallaxRange * 0.3;

    // Smoothly interpolate current camera position toward target position
    camera.position.x += (targetX - camera.position.x) * ease(0.05);
    camera.position.y += (targetY - camera.position.y) * ease(0.05);

    // Always keep looking at the central target
    camera.lookAt(lookTarget);
  }

  // Smooth mouse calculation for shaders so the repulsion isn't jittery
  smoothMouse.x += (mouse.x - smoothMouse.x) * ease(0.1);
  smoothMouse.y += (mouse.y - smoothMouse.y) * ease(0.1);

  // Update custom shader uniforms
  if (splatMesh && splatMesh.userData.uniforms) {
    splatMesh.userData.uniforms.time.value = time / 1000;
    splatMesh.userData.uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y);
    splatMesh.userData.uniforms.uCameraPos.value.copy(camera.position);

    // Advance the reveal wave once the intro has closed (easeOutQuad: bursts out, then settles)
    const revealFront = splatMesh.userData.uniforms.uRevealFront;
    if (props.reveal && revealFront.value < 1 + REVEAL_BAND) {
      revealElapsed += dt;
      const p = Math.min(Math.max((revealElapsed - REVEAL_DELAY_MS) / REVEAL_DURATION_MS, 0), 1);
      revealFront.value = (1 - (1 - p) * (1 - p)) * (1 + REVEAL_BAND);
    } else if (props.reveal) {
      targetFps = IDLE_FPS;
    }
  }

  // Ensure SPARK's own updates occur if necessary (skipped for PointCloud)
  if (splatMesh && typeof splatMesh.update === "function") {
    splatMesh.update({ time: time / 1000, viewToWorld: camera.matrixWorld, globalEdits: [] });
  }

  // Animate glass shards (slow tumble + float)
  const t = time / 1000;
  for (const shard of glassShards) {
    const u = shard.userData;
    shard.rotation.x += u.rotSpeed.x * (dt / 1000);
    shard.rotation.y += u.rotSpeed.y * (dt / 1000);
    shard.rotation.z += u.rotSpeed.z * (dt / 1000);
    shard.position.y = u.baseY + Math.sin(t * u.floatSpeed + u.floatOffset) * u.floatAmplitude;
  }

  // Update glass shader time
  if (glassUniforms) glassUniforms.time.value = t;

  // Two-pass rendering for screen-space refraction
  // Pass 1: Render scene WITHOUT glass shards to offscreen texture
  for (const shard of glassShards) shard.visible = false;
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // Pass 2: Render EVERYTHING (including glass reading from Pass 1 texture) to screen
  for (const shard of glassShards) shard.visible = true;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  if (status.value === "ready" && overlayEnabled.value) {
    updateCameraInfo();
  }
};

// ---- Lifecycle ----------------------------------------------------
onMounted(() => init().catch(console.error));
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (animationId) cancelAnimationFrame(animationId);
  // Dispose glass shards
  for (const shard of glassShards) {
    shard.geometry.dispose();
    scene.remove(shard);
  }
  glassShards = [];
  if (renderTarget) renderTarget.dispose();
  if (splatMesh) {
    // THREE.Points has no dispose(); release its geometry/material instead
    splatMesh.geometry.dispose();
    splatMesh.material.dispose();
  }
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
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #7db87d;
  color: #a8e6a3;
  font-family: "DotGothic16", monospace;
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
  color: #e57373;
  opacity: 0.9;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #050810;
}

.loading-text,
.error-text {
  font-family: "DotGothic16", monospace;
  font-size: 0.9rem;
  color: #7db87d;
}

.error-text {
  color: #e57373;
}

.fade-leave-active {
  transition: opacity 0.8s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
