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
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ---- Props --------------------------------------------------------
const props = defineProps({
  // Path to your .ply / .splat / .ksplat file under /public
  splatPath: {
    type: String,
    default: '/scene.ply',
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
    default: 0.1, // Reduced from 0.6 so the camera doesn't reveal the black void
  },
  // Alpha threshold – splats below this value are discarded (0-255)
  alphaThreshold: {
    type: Number,
    default: 5,
  },
  // Spherical harmonics degree (0=fastest, 1/2=more view-dependent colour)
  shDegree: {
    type: Number,
    default: 1,
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
    default: 'medium',
  }
})

// ---- State --------------------------------------------------------
const container  = ref(null)
const status     = ref('loading')   // 'loading' | 'ready' | 'error'
const progress   = ref(0)
const overlayEnabled = ref(false) // Turned off for production

// Mouse parallax state
const mouse = { x: 0, y: 0 }
let basePos = null
let lookTarget = null

// Camera info for overlay (left in for potential future debugging)
const camPos = ref({ x: '0.00', y: '0.00', z: '0.00' })
const camDir = ref({ x: '0.00', y: '0.00', z: '0.00' })

// ---- Internals ----------------------------------------------------
let viewer       = null
let renderer     = null
let camera       = null
let animationId  = null
let THREE        = null
let GS3D         = null

// ---- Init ---------------------------------------------------------

const onResize = () => {
  if (!renderer || !camera) return
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

const onMouseMove = (e) => {
  // Normalize mouse coordinates to -1 ... 1 but dampen it for 3DGS
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
}

// ---- Init ---------------------------------------------------------
const init = async () => {
  THREE = await import('three')
  GS3D  = await import('@mkkellogg/gaussian-splats-3d')

  basePos = new THREE.Vector3().fromArray(props.cameraPosition)
  lookTarget = new THREE.Vector3().fromArray(props.cameraLookAt)

  const w = window.innerWidth
  const h = window.innerHeight

  // Determine pixel ratio limit based on quality prop
  const maxPixelRatio = props.quality === 'high' ? 2 : (props.quality === 'low' ? 1 : 1.5)

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  container.value.appendChild(renderer.domElement)

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500)
  camera.position.fromArray(props.cameraPosition)
  camera.lookAt(new THREE.Vector3().fromArray(props.cameraLookAt))

  // SharedArrayBuffer は crossOriginIsolated 環境(COOP/COEPヘッダー)でのみ使用可能
  const canUseSharedMemory = typeof self !== 'undefined' && self.crossOriginIsolated === true

  // Determine SH degree and antialiasing based on quality
  const isHighQuality = props.quality === 'high'
  const finalShDegree = isHighQuality ? props.shDegree : 0

  viewer = new GS3D.Viewer({
    selfDrivenMode:               false,
    renderer,
    camera,
    useBuiltInControls:           false, // Disabled for background parallax effect
    initialCameraPosition:        props.cameraPosition,
    initialCameraLookAt:          props.cameraLookAt,
    gpuAcceleratedSort:           false, // Keep false to avoid crashing the canvas on some machines, but use below optimizations
    integerBasedSort:             true,  // Much faster splat sorting CPU side
    halfPrecisionCovariancesOnGPU: true, // Use 16-bit instead of 32-bit for GPU texture memory
    sharedMemoryForWorkers:       false,
    dynamicScene:                 false,
    webXRMode:                    GS3D.WebXRMode.None,
    renderMode:                   GS3D.RenderMode.Always,
    sceneRevealMode:              GS3D.SceneRevealMode.Instant,
    logLevel:                     GS3D.LogLevel.None, 
    sphericalHarmonicsDegree:     finalShDegree, // Disable SH on medium/low for massive FPS boost
    antialiased:                  isHighQuality, // Disable heavy anti-aliasing on medium/low
    focalAdjustment:              1.0,           
    freeIntermediateSplatData:    true,          // Free memory after load
  })

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)

  // ★ アニメーションループを先に起動 ★
  // addSplatScene の内部ではスプラットのソートが完了するまで Promise が
  // 解決されないが、ソートは viewer.update() が呼ばれないと進まない。
  // そのためループを先に動かしてデッドロックを回避する。
  animate()

  try {
    await viewer.addSplatScene(props.splatPath, {
      splatAlphaRemovalThreshold: 1, // Lower threshold to keep more fuzzy edges
      showLoadingUI:              false,
      position:                   props.scenePosition,
      rotation:                   props.sceneRotation,
      scale:                      props.sceneScale,
      onProgress: (pct) => { progress.value = pct },  // pct は 0–100
    })
    
    if (viewer.splatMesh) {
      console.log('[GaussianSplatBackground] Total splat count:', viewer.splatMesh.getSplatCount());
    }
    
    status.value = 'ready'
  } catch (err) {
    console.error('[GaussianSplatBackground] Failed to load splat:', err)
    status.value = 'error'
  }
}

// ---- Render loop --------------------------------------------------
let lastTime = 0
const FRAME_MS = 1000 / 60
const camDirectionVec = null // initialized later

const updateCameraInfo = () => {
  if (!camera) return
  camPos.value.x = camera.position.x.toFixed(2)
  camPos.value.y = camera.position.y.toFixed(2)
  camPos.value.z = camera.position.z.toFixed(2)
  
  const dir = new THREE.Vector3()
  camera.getWorldDirection(dir)
  camDir.value.x = dir.x.toFixed(2)
  camDir.value.y = dir.y.toFixed(2)
  camDir.value.z = dir.z.toFixed(2)
}

const animate = (time = 0) => {
  animationId = requestAnimationFrame(animate)
  if (time - lastTime < FRAME_MS) return
  lastTime = time

  // Apply parallax logic if camera is available
  if (camera && basePos && lookTarget) {
    // Calculate target position based on base position + mouse offset
    // Reduce Y-axis parallax by half to keep the horizon stable
    const targetX = basePos.x + (mouse.x * props.parallaxRange)
    const targetY = basePos.y + (mouse.y * props.parallaxRange * 0.3)
    
    // Smoothly interpolate current camera position toward target position
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    
    // Always keep looking at the central target
    camera.lookAt(lookTarget)
  }

  viewer.update()
  viewer.render()
  
  if (status.value === 'ready' && overlayEnabled.value) {
    updateCameraInfo()
  }
}

// ---- Lifecycle ----------------------------------------------------
onMounted(()       => init().catch(console.error))
onBeforeUnmount(() => {
  window.removeEventListener('resize',    onResize)
  window.removeEventListener('mousemove', onMouseMove)
  if (animationId) cancelAnimationFrame(animationId)
  viewer?.dispose()
  renderer?.dispose()
})
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
  font-family: 'DotGothic16', monospace;
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
  font-family: 'DotGothic16', monospace;
  font-size: 0.9rem;
  color: #7db87d;
}

.error-text { color: #e57373; }

.fade-leave-active { transition: opacity 0.8s ease; }
.fade-leave-to     { opacity: 0; }
</style>
