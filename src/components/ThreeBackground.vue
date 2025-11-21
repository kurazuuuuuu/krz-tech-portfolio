<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const container = ref(null)
let renderer = null
let scene = null
let camera = null
let particleGroup = null
let lines = null
let animationId = null
let particleData = []
let particleMeshes = []
let THREE = null

// Mouse state
const mouse = { x: 0, y: 0 }
const targetMouse = { x: 0, y: 0 }

const onMouseMove = (event) => {
  targetMouse.x = (event.clientX - window.innerWidth / 2) * 0.05
  targetMouse.y = (event.clientY - window.innerHeight / 2) * 0.05
}

const onWindowResize = () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

const init = async () => {
  // Dynamic import of Three.js and addons
  THREE = await import('three')
  const { WebGPURenderer } = await import('three/webgpu').catch(() => ({ WebGPURenderer: null }))
  
  // Scene setup
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.001)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  )
  camera.position.z = 400

  // Renderer setup with WebGPU check and fallback
  try {
    if (WebGPURenderer && navigator.gpu) {
      renderer = new WebGPURenderer({ alpha: true, antialias: true })
      console.log('Using WebGPURenderer')
    } else {
      throw new Error('WebGPU not supported')
    }
  } catch (e) {
    console.log('Falling back to WebGLRenderer:', e.message)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  }

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  
  if (container.value) {
    container.value.appendChild(renderer.domElement)
  }

  createParticles()
  animate()
  
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('mousemove', onMouseMove)
}

const createParticles = () => {
  const particleCount = 100
  const r = 800
  
  particleGroup = new THREE.Group()
  scene.add(particleGroup)

  const geometries = [
    new THREE.IcosahedronGeometry(6, 0),
    new THREE.OctahedronGeometry(5, 0),
    new THREE.TetrahedronGeometry(6, 0)
  ]

  const material = new THREE.MeshBasicMaterial({
    color: 0x2d5a2d,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  })

  for (let i = 0; i < particleCount; i++) {
    const geometry = geometries[Math.floor(Math.random() * geometries.length)]
    const mesh = new THREE.Mesh(geometry, material)
    
    const x = Math.random() * r - r / 2
    const y = Math.random() * r - r / 2
    const z = Math.random() * r - r / 2
    
    mesh.position.set(x, y, z)
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    
    particleGroup.add(mesh)
    particleMeshes.push(mesh)
    
    particleData.push({
      velocity: new THREE.Vector3(
        -0.5 + Math.random() * 1,
        -0.5 + Math.random() * 1,
        -0.5 + Math.random() * 1
      ),
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02
      }
    })
  }
  
  // Lines
  const lineGeometry = new THREE.BufferGeometry()
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x2d5a2d,
    transparent: true,
    opacity: 0.6
  })
  
  lines = new THREE.LineSegments(lineGeometry, lineMaterial)
  scene.add(lines)
}

const updateParticles = () => {
  if (!particleMeshes.length) return
  
  const particleCount = particleMeshes.length
  const r = 400
  const linePositions = []
  const connectDistance = 150
  
  for (let i = 0; i < particleCount; i++) {
    const mesh = particleMeshes[i]
    const data = particleData[i]
    
    mesh.position.x += data.velocity.x
    mesh.position.y += data.velocity.y
    mesh.position.z += data.velocity.z
    
    mesh.rotation.x += data.rotSpeed.x
    mesh.rotation.y += data.rotSpeed.y
    
    if (mesh.position.x < -r || mesh.position.x > r) data.velocity.x = -data.velocity.x
    if (mesh.position.y < -r || mesh.position.y > r) data.velocity.y = -data.velocity.y
    if (mesh.position.z < -r || mesh.position.z > r) data.velocity.z = -data.velocity.z
  }
  
  for (let i = 0; i < particleCount; i++) {
    const meshA = particleMeshes[i]
    for (let j = i + 1; j < particleCount; j++) {
      const meshB = particleMeshes[j]
      const dx = meshA.position.x - meshB.position.x
      const dy = meshA.position.y - meshB.position.y
      const dz = meshA.position.z - meshB.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (dist < connectDistance) {
        linePositions.push(
          meshA.position.x, meshA.position.y, meshA.position.z,
          meshB.position.x, meshB.position.y, meshB.position.z
        )
      }
    }
  }
  
  lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
}

// FPS Limiter
const fps = 90
const interval = 1000 / fps
let lastTime = 0

const animate = (time) => {
  animationId = requestAnimationFrame(animate)

  const delta = time - lastTime
  
  if (delta > interval) {
    // Adjust lastTime to account for the extra time (modulo) to keep smooth intervals
    lastTime = time - (delta % interval)

    if (camera && scene && renderer) {
      camera.position.x += (targetMouse.x - camera.position.x) * 0.05
      camera.position.y += (targetMouse.y - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)
      
      if (particleGroup) {
        particleGroup.rotation.y += 0.0005
        lines.rotation.y += 0.0005
      }

      updateParticles()
      
      // WebGPURenderer requires renderAsync, WebGLRenderer uses render
      if (renderer.isWebGPURenderer) {
        renderer.renderAsync(scene, camera)
      } else {
        renderer.render(scene, camera)
      }
    }
  }
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('mousemove', onMouseMove)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
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
  background: rgba(26, 61, 26, 0.4);
}
</style>
