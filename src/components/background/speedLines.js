/*
 * WebGL の LineSegments は線幅が 1px 固定で太さを出せないので、細長い板ポリを
 * インスタンス描画 (InstancedBufferGeometry + Mesh = 1 ドローコール) し、
 * 頂点シェーダで「軸まわりビルボード」させて線に見せている。
 */

const DEPTH_BIAS = 0.65;
const SCREEN_MARGIN = 1.15;
const WRAP_ASPECT = 2.4;
const ASPECT_REBUILD_RATIO = 1.35;

const lerp = (a, b, t) => a + (b - a) * t;

const pickWeighted = (weights) => {
  const keys = Object.keys(weights);
  let total = 0;
  for (const key of keys) total += Math.max(weights[key], 0);
  if (total <= 0) return keys[0];
  let r = Math.random() * total;
  for (const key of keys) {
    r -= Math.max(weights[key], 0);
    if (r <= 0) return key;
  }
  return keys[keys.length - 1];
};

const vertexShader = `
  attribute vec3 aBase;
  attribute vec3 aAxis;
  attribute vec2 aSize;
  attribute vec2 aFlow;
  attribute float aPhase;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uRevealFront;
  uniform float uRevealBand;
  uniform vec2 uRevealRange;
  uniform vec2 uFog;

  varying vec3 vColor;
  varying float vFog;

  void main() {
    float span = max(aFlow.y, 1e-3);
    float travel = mod(aPhase + aFlow.x * uTime, span) - span * 0.5;
    vec3 center = aBase + aAxis * travel;

    vec3 centerView = (modelViewMatrix * vec4(center, 1.0)).xyz;

    float viewDist = length(centerView);
    float revealT = clamp(
      (log(max(viewDist, 1e-3)) - uRevealRange.x) / max(uRevealRange.y - uRevealRange.x, 1e-3),
      0.0, 1.0
    );
    float passed = clamp((uRevealFront - revealT) / max(uRevealBand, 1e-3), 0.0, 1.0);
    float grow = 1.0 - pow(1.0 - passed, 3.0);

    vColor = aColor;

    if (grow < 0.001) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vFog = 1.0;
      return;
    }

    vec3 axisView = normalize((modelViewMatrix * vec4(aAxis, 0.0)).xyz);
    vec3 viewDir = normalize(-centerView);
    vec3 sideView = cross(axisView, viewDir);
    float sideLen = length(sideView);
    vec3 fallback = abs(axisView.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    sideView = sideLen > 1e-4 ? sideView / sideLen : normalize(cross(axisView, fallback));

    vec3 posView = centerView
      + axisView * (position.x * aSize.x * grow)
      + sideView * (position.y * aSize.y);

    gl_Position = projectionMatrix * vec4(posView, 1.0);

    // (near >= far を GUI で作れてしまうので smoothstep が壊れないよう下駄を履かせる)
    vFog = smoothstep(uFog.x, max(uFog.y, uFog.x + 1e-3), -posView.z);
  }
`;

const fragmentShader = `
  uniform vec3 uBgColor;

  varying vec3 vColor;
  varying float vFog;

  void main() {
    gl_FragColor = vec4(mix(vColor, uBgColor, clamp(vFog, 0.0, 1.0)), 1.0);
    #include <colorspace_fragment>
  }
`;

export const createSpeedLines = (THREE, { camera, tuning, count, revealBand, motionless }) => {
  const uniforms = {
    uTime: { value: 0 },
    uRevealFront: { value: 0 },
    uRevealBand: { value: revealBand },
    uRevealRange: { value: new THREE.Vector2(0, 1) },
    uFog: { value: new THREE.Vector2(tuning.lineFogNear, tuning.lineFogFar) },
    uBgColor: { value: new THREE.Color(tuning.bgColor) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const buildGeometry = (lineCount) => {
    const geometry = new THREE.InstancedBufferGeometry();

    // prettier-ignore
    const quad = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(quad, 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const n = Math.max(0, Math.round(lineCount));
    const base = new Float32Array(n * 3);
    const axis = new Float32Array(n * 3);
    const size = new Float32Array(n * 2);
    const flow = new Float32Array(n * 2);
    const phase = new Float32Array(n);
    const color = new Float32Array(n * 3);

    camera.updateMatrixWorld(true);
    const fovRad = (camera.fov * Math.PI) / 180;
    const frustumHeightAt = (d) => 2 * d * Math.tan(fovRad / 2);

    const baseRad = (-tuning.lineAngleDeg * Math.PI) / 180;
    const jitterRad = (tuning.lineAngleJitterDeg * Math.PI) / 180;

    const tmpVec = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const depth = lerp(
        tuning.lineDepthNear,
        tuning.lineDepthFar,
        Math.pow(Math.random(), DEPTH_BIAS),
      );
      const h = frustumHeightAt(depth);
      const halfH = (h / 2) * SCREEN_MARGIN;
      const halfW = halfH * camera.aspect;

      const rad = baseRad + (Math.random() * 2 - 1) * jitterRad;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const length = h * lerp(tuning.lineLengthMin, tuning.lineLengthMax, Math.random());
      const width = h * lerp(tuning.lineWidthMin, tuning.lineWidthMax, Math.random());
      const speed = h * lerp(tuning.lineSpeedMin, tuning.lineSpeedMax, Math.random());

      const spanHalfW = halfH * Math.max(camera.aspect, WRAP_ASPECT);
      const alongExtent = 2 * (spanHalfW * cos + halfH * sin);
      const sideExtent = 2 * (halfW * sin + halfH * cos);
      const span = alongExtent + length * 1.2;

      const sideOffset = (Math.random() - 0.5) * sideExtent;
      tmpVec
        .set(-Math.sin(rad) * sideOffset, Math.cos(rad) * sideOffset, -depth)
        .applyMatrix4(camera.matrixWorld);
      base[i * 3] = tmpVec.x;
      base[i * 3 + 1] = tmpVec.y;
      base[i * 3 + 2] = tmpVec.z;

      tmpVec.set(Math.cos(rad), Math.sin(rad), 0).transformDirection(camera.matrixWorld);
      axis[i * 3] = tmpVec.x;
      axis[i * 3 + 1] = tmpVec.y;
      axis[i * 3 + 2] = tmpVec.z;

      size[i * 2] = length;
      size[i * 2 + 1] = width;
      flow[i * 2] = speed;
      flow[i * 2 + 1] = span;
      phase[i] = Math.random() * span;

      tmpColor.set(tuning.lineColors[pickWeighted(tuning.lineColorWeights)]);
      color[i * 3] = tmpColor.r;
      color[i * 3 + 1] = tmpColor.g;
      color[i * 3 + 2] = tmpColor.b;
    }

    geometry.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
    geometry.setAttribute("aAxis", new THREE.InstancedBufferAttribute(axis, 3));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 2));
    geometry.setAttribute("aFlow", new THREE.InstancedBufferAttribute(flow, 2));
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3));
    geometry.instanceCount = n;

    return geometry;
  };

  let currentCount = Math.max(0, Math.round(count));
  let builtAspect = camera.aspect;

  const mesh = new THREE.Mesh(buildGeometry(currentCount), material);
  // 板はシェーダ側で動かすのでバウンディングボックスが当てにならない
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;

  let elapsed = 0;

  const rebuild = (nextCount = currentCount) => {
    currentCount = Math.max(0, Math.round(nextCount));
    builtAspect = camera.aspect;
    const old = mesh.geometry;
    mesh.geometry = buildGeometry(currentCount);
    old.dispose();
  };

  return {
    mesh,
    uniforms,

    applyTuning() {
      uniforms.uFog.value.set(tuning.lineFogNear, tuning.lineFogFar);
      uniforms.uBgColor.value.set(tuning.bgColor);
    },

    rebuild,

    handleResize() {
      const aspect = camera.aspect;
      if (aspect <= 0 || builtAspect <= 0) return;
      const ratio = Math.max(aspect / builtAspect, builtAspect / aspect);
      if (ratio > ASPECT_REBUILD_RATIO) rebuild();
    },

    setRevealRange(near, far) {
      uniforms.uRevealRange.value.set(near, far);
    },

    update(dt, revealFront) {
      if (!motionless) elapsed += dt / 1000;
      uniforms.uTime.value = elapsed;
      uniforms.uRevealFront.value = revealFront;
    },

    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
};
