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
  // Path to your .ply / .spz / .splat / .ksplat file under /public
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
// Smooth mouse for shader interactions
const smoothMouse = { x: 0, y: 0 }
let basePos = null
let lookTarget = null

// Camera info for overlay
const camPos = ref({ x: '0.00', y: '0.00', z: '0.00' })
const camDir = ref({ x: '0.00', y: '0.00', z: '0.00' })

// ---- Internals ----------------------------------------------------
let renderer      = null
let camera        = null
let scene         = null
let splatMesh     = null
let animationId   = null
let THREE         = null
let SPARK         = null
let glassShards   = []
let renderTarget  = null // Offscreen buffer for screen-space refraction
let glassUniforms = null // Shared uniforms for glass shader

// ---- Event Listeners ----------------------------------------------
const onResize = () => {
  if (!renderer || !camera) return
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  // Resize offscreen render target too
  if (renderTarget) renderTarget.setSize(w, h)
  if (glassUniforms) glassUniforms.resolution.value.set(w, h)
}

const onMouseMove = (e) => {
  // Normalize mouse coordinates to -1 ... 1
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
}

// ---- Init ---------------------------------------------------------
const init = async () => {
  THREE = await import('three')
  SPARK = await import('@sparkjsdev/spark')

  basePos = new THREE.Vector3().fromArray(props.cameraPosition)
  lookTarget = new THREE.Vector3().fromArray(props.cameraLookAt)

  const w = window.innerWidth
  const h = window.innerHeight

  // Determine pixel ratio limit based on quality prop
  const maxPixelRatio = props.quality === 'high' ? 2 : (props.quality === 'low' ? 1 : 1.5)

  // Standard THREE.js Setup
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  // Enable tone mapping for PBR glass material
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.value.appendChild(renderer.domElement)

  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 500) // Changed FOV from 60 to 50 for a 1.2x zoom
  camera.position.fromArray(props.cameraPosition)
  camera.lookAt(new THREE.Vector3().fromArray(props.cameraLookAt))

  scene = new THREE.Scene()

  // Offscreen render target for screen-space refraction
  renderTarget = new THREE.WebGLRenderTarget(w, h, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  })

  // Add subtle ambient + directional lighting for glass highlights
  const ambientLight = new THREE.AmbientLight(0x7db87d, 0.3)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight.position.set(2, 3, 1)
  scene.add(dirLight)

  // Generate glowing circle texture for holographic points
  const createCircleTexture = () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    const center = size / 2
    
    const gradient = context.createRadialGradient(center, center, 0, center, center, center)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    
    return new THREE.CanvasTexture(canvas)
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)

  // Create glass shards scattered in the scene
  createGlassShards()

  // Start the render loop immediately
  animate()

  // Load the 3DGS model using SPARK
  try {
    const loader = new SPARK.SplatLoader()
    
    await new Promise((resolve, reject) => {
      loader.load(
        props.splatPath,
        (packedSplats) => {
          // Splat loaded and parsed, now construct the point cloud
          const count = packedSplats.numSplats
          
          // Pre-allocate buffers
          const positions = new Float32Array(count * 3)
          const colors = new Float32Array(count * 3)
          
          let validPoints = 0
          const minAlpha = props.alphaThreshold / 255.0
          
          packedSplats.forEachSplat((index, center, scales, quaternion, opacity, color) => {
            // Drop points with extremely low opacity to save rendering vertex count
            if (opacity < Math.max(minAlpha, 0.05)) return 

            positions[validPoints * 3]     = center.x
            positions[validPoints * 3 + 1] = center.y
            positions[validPoints * 3 + 2] = center.z
            
            colors[validPoints * 3]     = color.r
            colors[validPoints * 3 + 1] = color.g
            colors[validPoints * 3 + 2] = color.b
            
            validPoints++
          })

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, validPoints * 3), 3))
          geometry.setAttribute('color', new THREE.BufferAttribute(colors.subarray(0, validPoints * 3), 3))

          const circleTexture = createCircleTexture()

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
          })

          // Add custom shader for brightness-wobble, depth fog, iridescence, and mouse repulsion
          const customUniforms = { 
            time: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uCameraPos: { value: new THREE.Vector3() },
            uColorA: { value: new THREE.Color(0x7db87d) }, // Base cyber green
            uColorB: { value: new THREE.Color(0x42f5e3) }, // Cyan for iridescence
          }
          
          material.onBeforeCompile = (shader) => {
            shader.uniforms.time = customUniforms.time
            shader.uniforms.uMouse = customUniforms.uMouse
            shader.uniforms.uCameraPos = customUniforms.uCameraPos
            shader.uniforms.uColorA = customUniforms.uColorA
            shader.uniforms.uColorB = customUniforms.uColorB
            
            // Pass varying to fragment shader for colors
            shader.vertexShader = `
              uniform float time;
              uniform vec2 uMouse;
              uniform vec3 uCameraPos;
              uniform vec3 uColorA;
              uniform vec3 uColorB;
              varying vec3 vMixedColor;
              varying float vDepth;
            \n` + shader.vertexShader
            
            // Replace the position transform logic to inject wobble & mouse repulsion
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
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
              vMixedColor = mix(uColorA, uColorB, mixFactor) * brightness * 2.0;
              
              // 5. Calculate Depth for Fog
              vDepth = ndcPos.z / ndcPos.w;
              `
            )

            // Fragment Shader setup
            shader.fragmentShader = `
              varying vec3 vMixedColor;
              varying float vDepth;
            \n` + shader.fragmentShader
            
            // Replace outgoing color logic to use mixed color and apply Depth Fog
            shader.fragmentShader = shader.fragmentShader.replace(
              'vec4 diffuseColor = vec4( diffuse, opacity );',
              `
              vec4 diffuseColor = vec4( vMixedColor, opacity );
              `
            ).replace(
              '#include <dithering_fragment>',
              `
              #include <dithering_fragment>
              
              // Depth Fog calculation (fade out points extremely far or extremely close)
              float fogNear = 0.5;
              float fogFar = 2.0;
              float fogFactor = smoothstep(fogNear, fogFar, vDepth);
              gl_FragColor.a *= (1.0 - fogFactor); // Fade out distant points
              `
            )
          }

          splatMesh = new THREE.Points(geometry, material)
          splatMesh.userData.uniforms = customUniforms

          // Apply user transformations
          splatMesh.quaternion.fromArray(props.sceneRotation)
          splatMesh.position.fromArray(props.scenePosition)
          splatMesh.scale.fromArray(props.sceneScale)

          scene.add(splatMesh)
          console.log('[GaussianSplatBackground] PointCloud created with points:', validPoints, 'from original:', count)
          resolve()
        },
        (xhr) => {
          // Update progress bar
          if (xhr.total > 0) {
            progress.value = (xhr.loaded / xhr.total) * 100
          } else {
            // For chunks without total length header
            progress.value = Math.min((xhr.loaded / 30000000) * 100, 99) 
          }
        },
        (err) => {
          reject(err)
        }
      )
    })
    
    status.value = 'ready'
  } catch (err) {
    console.error('[GaussianSplatBackground] Failed to load splat via SPARK:', err)
    status.value = 'error'
  }
}

// ---- Glass Shards (Screen-Space Refraction) ----------------------
const createGlassShards = () => {
  const shardCount = 50

  // Shared uniforms for all glass shards
  glassUniforms = {
    tBackground: { value: renderTarget.texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    time: { value: 0 },
  }

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
  })

  for (let i = 0; i < shardCount; i++) {
    // Create random triangular shard geometry
    const geometry = new THREE.BufferGeometry()
    const scale = 0.05 + Math.random() * 0.15
    const vertices = new Float32Array([
      (Math.random() - 0.5) * scale, (Math.random() - 0.3) * scale * 1.5, (Math.random() - 0.5) * scale * 0.3,
      (Math.random() - 0.5) * scale, (Math.random() + 0.2) * scale * 1.5, (Math.random() - 0.5) * scale * 0.3,
      (Math.random() + 0.3) * scale, (Math.random() - 0.5) * scale * 1.5, (Math.random() - 0.5) * scale * 0.3,
    ])
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()

    const shard = new THREE.Mesh(geometry, glassMaterial)
    shard.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.3) * 0.8,
      -0.3 - Math.random() * 2.5
    )
    shard.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )
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
    }
    scene.add(shard)
    glassShards.push(shard)
  }
  console.log('[GaussianSplatBackground] Created', shardCount, 'glass shards with screen-space refraction')
}

// ---- Render loop --------------------------------------------------
let lastTime = 0
const FRAME_MS = 1000 / 60

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
    // Reduce Y-axis parallax by half to keep the horizon stable
    const targetX = basePos.x + (mouse.x * props.parallaxRange)
    const targetY = basePos.y + (mouse.y * props.parallaxRange * 0.3)
    
    // Smoothly interpolate current camera position toward target position
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    
    // Always keep looking at the central target
    camera.lookAt(lookTarget)
  }

  // Smooth mouse calculation for shaders so the repulsion isn't jittery
  smoothMouse.x += (mouse.x - smoothMouse.x) * 0.1
  smoothMouse.y += (mouse.y - smoothMouse.y) * 0.1

  // Update custom shader uniforms
  if (splatMesh && splatMesh.userData.uniforms) {
    splatMesh.userData.uniforms.time.value = time / 1000
    splatMesh.userData.uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y)
    splatMesh.userData.uniforms.uCameraPos.value.copy(camera.position)
  }

  // Ensure SPARK's own updates occur if necessary (skipped for PointCloud)
  if (splatMesh && typeof splatMesh.update === 'function') {
    splatMesh.update({ time: time / 1000, viewToWorld: camera.matrixWorld, globalEdits: [] })
  }

  // Animate glass shards (slow tumble + float)
  const t = time / 1000
  for (const shard of glassShards) {
    const u = shard.userData
    shard.rotation.x += u.rotSpeed.x * 0.016
    shard.rotation.y += u.rotSpeed.y * 0.016
    shard.rotation.z += u.rotSpeed.z * 0.016
    shard.position.y = u.baseY + Math.sin(t * u.floatSpeed + u.floatOffset) * u.floatAmplitude
  }

  // Update glass shader time
  if (glassUniforms) glassUniforms.time.value = t

  // Two-pass rendering for screen-space refraction
  // Pass 1: Render scene WITHOUT glass shards to offscreen texture
  for (const shard of glassShards) shard.visible = false
  renderer.setRenderTarget(renderTarget)
  renderer.render(scene, camera)

  // Pass 2: Render EVERYTHING (including glass reading from Pass 1 texture) to screen
  for (const shard of glassShards) shard.visible = true
  renderer.setRenderTarget(null)
  renderer.render(scene, camera)
  
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
  // Dispose glass shards
  for (const shard of glassShards) {
    shard.geometry.dispose()
    scene.remove(shard)
  }
  glassShards = []
  if (renderTarget) renderTarget.dispose()
  if (splatMesh) splatMesh.dispose()
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
