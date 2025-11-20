<template>
  <div ref="container" class="three-container"></div>
</template>

<script>
import * as THREE from 'three'

export default {
  name: 'ThreeBackground',
  data() {
    return {
      mouse: { x: 0, y: 0 },
      targetMouse: { x: 0, y: 0 }
    }
  },
  created() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.particleGroup = null
    this.lines = null
    this.animationId = null
    this.particleData = []
    this.particleMeshes = []
  },
  mounted() {
    try {
      this.init()
      this.animate()
      window.addEventListener('resize', this.onWindowResize)
      window.addEventListener('mousemove', this.onMouseMove)
    } catch (error) {
      console.error("ThreeBackground init failed:", error)
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.onMouseMove)
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    if (this.renderer) {
      this.renderer.dispose()
    }
  },
  methods: {
    init() {
      // Scene setup
      this.scene = new THREE.Scene()
      this.scene.fog = new THREE.FogExp2(0x000000, 0.001)

      // Camera setup
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        1000
      )
      this.camera.position.z = 400

      // Renderer setup
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.renderer.setPixelRatio(window.devicePixelRatio)
      
      if (this.$refs.container) {
        this.$refs.container.appendChild(this.renderer.domElement)
      } else {
        console.error("ThreeBackground: container ref is missing")
        return
      }

      // Create Particles
      this.createParticles()
    },

    createParticles() {
      const particleCount = 100 // Reduced count slightly for performance with meshes
      const r = 800
      
      this.particleGroup = new THREE.Group()
      this.scene.add(this.particleGroup)

      const geometries = [
        new THREE.IcosahedronGeometry(6, 0),
        new THREE.OctahedronGeometry(5, 0),
        new THREE.TetrahedronGeometry(6, 0)
      ]

      const material = new THREE.MeshBasicMaterial({
        color: 0x7db87d,
        wireframe: true,
        transparent: true,
        opacity: 0.6
      })

      for (let i = 0; i < particleCount; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)]
        const mesh = new THREE.Mesh(geometry, material)
        
        const x = Math.random() * r - r / 2
        const y = Math.random() * r - r / 2
        const z = Math.random() * r - r / 2
        
        mesh.position.set(x, y, z)
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
        
        this.particleGroup.add(mesh)
        this.particleMeshes.push(mesh)
        
        this.particleData.push({
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
      
      // Lines for connections
      const lineGeometry = new THREE.BufferGeometry()
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xa8e6a3,
        transparent: true,
        opacity: 0.15
      })
      
      this.lines = new THREE.LineSegments(lineGeometry, lineMaterial)
      this.scene.add(this.lines)
    },

    onWindowResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
      }
    },

    onMouseMove(event) {
      this.targetMouse.x = (event.clientX - window.innerWidth / 2) * 0.05
      this.targetMouse.y = (event.clientY - window.innerHeight / 2) * 0.05
    },

    animate() {
      this.animationId = requestAnimationFrame(this.animate)

      // Smooth camera movement
      this.camera.position.x += (this.targetMouse.x - this.camera.position.x) * 0.05
      this.camera.position.y += (this.targetMouse.y - this.camera.position.y) * 0.05
      this.camera.lookAt(0, 0, 0)
      
      // Rotate entire group slowly
      if (this.particleGroup) {
        this.particleGroup.rotation.y += 0.0005
        this.lines.rotation.y += 0.0005
      }

      this.updateParticles()
      this.renderer.render(this.scene, this.camera)
    },
    
    updateParticles() {
      if (!this.particleMeshes.length) return
      
      const particleCount = this.particleMeshes.length
      const r = 400
      const linePositions = []
      const connectDistance = 150
      
      // Update positions and rotations
      for (let i = 0; i < particleCount; i++) {
        const mesh = this.particleMeshes[i]
        const data = this.particleData[i]
        
        // Move
        mesh.position.x += data.velocity.x
        mesh.position.y += data.velocity.y
        mesh.position.z += data.velocity.z
        
        // Rotate individual shapes
        mesh.rotation.x += data.rotSpeed.x
        mesh.rotation.y += data.rotSpeed.y
        
        // Bounce
        if (mesh.position.x < -r || mesh.position.x > r) data.velocity.x = -data.velocity.x
        if (mesh.position.y < -r || mesh.position.y > r) data.velocity.y = -data.velocity.y
        if (mesh.position.z < -r || mesh.position.z > r) data.velocity.z = -data.velocity.z
      }
      
      // Update lines (brute force O(n^2) but n=100 is fine)
      // We need world positions because the group is rotating? 
      // Actually, if lines and group rotate together, we can use local positions.
      
      for (let i = 0; i < particleCount; i++) {
        const meshA = this.particleMeshes[i]
        
        for (let j = i + 1; j < particleCount; j++) {
          const meshB = this.particleMeshes[j]
          
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
      
      this.lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    }
  }
}
</script>

<style scoped>
.three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; /* Behind everything */
  pointer-events: none;
  background: rgba(26, 61, 26, 0.4); /* Semi-transparent dark green to blend with bg image */
}
</style>
