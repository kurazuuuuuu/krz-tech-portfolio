<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const container = ref(null)
let renderer, scene, camera, points, animationId
let THREE = null

// Mouse state
const mouse  = { x: 0, y: 0 }
const target = { x: 0, y: 0 }
const MOUSE_RANGE = 8

const onMouseMove = (e) => {
  target.x = (e.clientX / window.innerWidth  - 0.5) * 1
  target.y = (e.clientY / window.innerHeight - 0.5) * 1
}

const onResize = () => {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// ---- Gaussian splat texture ----
const createGaussianTexture = () => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx  = canvas.getContext('2d')
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0.00, 'rgba(255,255,255,1.0)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.60, 'rgba(255,255,255,0.25)')
  grad.addColorStop(1.00, 'rgba(255,255,255,0.00)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// ---- Sample image → point cloud geometry ----
const buildGeometry = (imageData, imgW, imgH) => {
  const aspect  = imgW / imgH
  const scaleX  = 150 * aspect
  const scaleY  = 150

  // Aim for ~12 000 splat points
  const stride = Math.max(1, Math.floor(Math.sqrt((imgW * imgH) / 12000)))

  const positions = []
  const aColors   = []
  const aSizes    = []

  for (let iy = 0; iy < imgH; iy += stride) {
    for (let ix = 0; ix < imgW; ix += stride) {
      const i = (iy * imgW + ix) * 4
      const r = imageData[i]     / 255
      const g = imageData[i + 1] / 255
      const b = imageData[i + 2] / 255
      const a = imageData[i + 3] / 255
      if (a < 0.5) continue

      // World X / Y from image UV
      const px = (ix / imgW - 0.5) * scaleX
      const py = -(iy / imgH - 0.5) * scaleY

      // -- Depth heuristic for indoor top-down elevator scene --
      // Luminance: brighter surfaces (walls, floor) → slightly closer
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      // Distance from image center: edges of the elevator = farther away
      const cx = ix / imgW - 0.5   // -0.5 … +0.5
      const cy = iy / imgH - 0.5
      const distFromCenter = Math.sqrt(cx * cx + cy * cy) * Math.SQRT2  // 0 … 1

      // Combine: center + bright = closer
      const pz = -55
        + lum            * 10   // bright → near
        - distFromCenter * 35   // edges  → far
        + (Math.random() - 0.5) * 8   // depth jitter for volume feel

      positions.push(px, py, pz)
      aColors.push(r, g, b)

      // Splat size: closer points appear slightly larger
      const normZ = Math.max(0, Math.min(1, (pz + 55) / 55))
      aSizes.push(3.0 + normZ * 7.0)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aColor',   new THREE.Float32BufferAttribute(aColors,   3))
  geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(aSizes,    1))
  return geo
}

// ---- Custom GLSL shaders ----
const vertexShader = /* glsl */`
  attribute vec3  aColor;
  attribute float aSize;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    // Perspective-correct point size
    gl_PointSize = aSize * (280.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`

const fragmentShader = /* glsl */`
  uniform sampler2D uTex;
  uniform float uBrightness;
  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(uTex, gl_PointCoord);
    if (tex.a < 0.02) discard;
    // Boost color brightness for additive blending
    gl_FragColor = vec4(vColor * uBrightness, tex.a * 0.7);
  }
`

// ---- Image loading helpers ----
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => resolve(img)
  img.onerror = reject
  img.src = src
})

const rasterizeImage = (img, maxDim = 512) => {
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
  const w = Math.floor(img.width  * scale)
  const h = Math.floor(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  return { data, width: w, height: h }
}

// ---- Init ----
const init = async () => {
  THREE = await import('three')

  // Scene background: deep dark so additive splats pop
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050810)

  camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    800
  )
  camera.position.set(0, 0, 110)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  if (container.value) {
    container.value.appendChild(renderer.domElement)
  }

  // Build point cloud from background image
  try {
    const img = await loadImage('/img/vrc_background.webp')
    const { data, width, height } = rasterizeImage(img, 512)
    const geo = buildGeometry(data, width, height)
    const tex = createGaussianTexture()

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex:        { value: tex },
        uBrightness: { value: 2.8 },  // boost colour intensity
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,  // overlapping splats accumulate brightness
    })

    points = new THREE.Points(geo, mat)
    scene.add(points)
  } catch (err) {
    console.warn('[ThreeBackground] Image load failed, rendering without point cloud:', err)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize',    onResize)
  animate()
}

// ---- Render loop ----
let lastTime = 0
const FRAME_INTERVAL = 1000 / 60

const animate = (time = 0) => {
  animationId = requestAnimationFrame(animate)
  if (time - lastTime < FRAME_INTERVAL) return
  lastTime = time

  // Smooth camera follow
  mouse.x += (target.x *  MOUSE_RANGE - mouse.x) * 0.055
  mouse.y += (target.y * -MOUSE_RANGE - mouse.y) * 0.055

  if (camera) {
    camera.position.x = mouse.x
    camera.position.y = mouse.y
    camera.lookAt(0, 0, 0)
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

onMounted(()       => init())
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize',    onResize)
  if (animationId) cancelAnimationFrame(animationId)
  renderer?.dispose()
})
</script>

<style scoped>
.three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
