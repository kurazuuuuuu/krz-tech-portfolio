/**
 * 背景に散らす「ソリッドなスピード線」。
 *
 * WebGL の LineSegments は線幅が 1px 固定で太さを出せないので、細長い板ポリを
 * インスタンス描画 (InstancedBufferGeometry + Mesh = 1 ドローコール) し、
 * 頂点シェーダで「軸まわりビルボード」させて線に見せている。
 * 板は常にカメラの方を向くが、線の軸方向だけは保たれる。
 *
 * 位置・向き・長さ・太さ・色・速度は生成時にインスタンス属性へ焼き込み、
 * 流れ (wrap) とリビールの伸びはシェーダ内で時間から求めるので、毎フレームの CPU 仕事は uniform 更新だけ。
 */

// 手前に線が溜まるとヒーローの立ち絵と喧嘩するので、奥寄りに分布させる指数 (1 未満で奥寄り)
const DEPTH_BIAS = 0.65;
// 画面端の少し外まで配置して、出入りが唐突にならないようにする余白
const SCREEN_MARGIN = 1.15;
// 巻き戻し幅を見積もるときの最低アスペクト比 (リサイズで横に広がっても巻き戻しが画面内に出ないように)
const WRAP_ASPECT = 2.4;
// これを超えるアスペクト比の変化で線を作り直す (SCREEN_MARGIN 1.15 で吸収できる範囲より大きい変化)
const ASPECT_REBUILD_RATIO = 1.35;

const lerp = (a, b, t) => a + (b - a) * t;

// 重み付き抽選。色の配分 (ビビッド 60 / 墨 15 / ネオン 15 / 白 10) に使う
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

const vertexShader = /* glsl */ `
  attribute vec3 aBase;   // 軸方向の流れが 0 のときのワールド座標
  attribute vec3 aAxis;   // ワールド空間での線の向き (正規化済み)
  attribute vec2 aSize;   // x = 長さ, y = 太さ (ワールド単位)
  attribute vec2 aFlow;   // x = 速度 (単位/秒), y = 巻き戻しの周期長
  attribute float aPhase; // 流れの初期位相 (線ごとにばらけさせる)
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uRevealFront;
  uniform float uRevealBand;
  uniform vec2 uRevealRange; // (log 近距離, log 遠距離)
  uniform vec2 uFog;         // (near, far) NDC 深度

  varying vec3 vColor;
  varying float vFog;

  void main() {
    // --- 軸方向へ流し、周期長を超えたら反対側へ巻き戻す ---
    float span = max(aFlow.y, 1e-3);
    float travel = mod(aPhase + aFlow.x * uTime, span) - span * 0.5;
    vec3 center = aBase + aAxis * travel;

    vec3 centerView = (modelViewMatrix * vec4(center, 1.0)).xyz;

    // --- リビール: 点群と同じ log 距離の波面が届いたら軸方向へシュッと伸びる ---
    float viewDist = length(centerView);
    float revealT = clamp(
      (log(max(viewDist, 1e-3)) - uRevealRange.x) / max(uRevealRange.y - uRevealRange.x, 1e-3),
      0.0, 1.0
    );
    float passed = clamp((uRevealFront - revealT) / max(uRevealBand, 1e-3), 0.0, 1.0);
    float grow = 1.0 - pow(1.0 - passed, 3.0); // ease-out

    vColor = aColor;

    if (grow < 0.001) {
      // 波面到達前。長さ 0 でも太さぶんが点として残るのでクリップ外へ飛ばして消す
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vFog = 1.0;
      return;
    }

    // --- 軸まわりビルボード: 「線の軸 x 視線」の外積が板の幅方向 ---
    vec3 axisView = normalize((modelViewMatrix * vec4(aAxis, 0.0)).xyz);
    vec3 viewDir = normalize(-centerView);
    vec3 sideView = cross(axisView, viewDir);
    float sideLen = length(sideView);
    // 軸が視線とほぼ平行だと幅が潰れるので、その時だけ適当な直交軸で代替する
    vec3 fallback = abs(axisView.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    sideView = sideLen > 1e-4 ? sideView / sideLen : normalize(cross(axisView, fallback));

    vec3 posView = centerView
      + axisView * (position.x * aSize.x * grow)
      + sideView * (position.y * aSize.y);

    gl_Position = projectionMatrix * vec4(posView, 1.0);

    // Depth Fog: 点群と同じく、ビュー空間の線形深度で遠いほど背景色へ溶かす
    // (near >= far を GUI で作れてしまうので smoothstep が壊れないよう下駄を履かせる)
    vFog = smoothstep(uFog.x, max(uFog.y, uFog.x + 1e-3), -posView.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBgColor;

  varying vec3 vColor;
  varying float vFog;

  void main() {
    // 不透明のまま、遠い線ほど色を背景色へ寄せる
    gl_FragColor = vec4(mix(vColor, uBgColor, clamp(vFog, 0.0, 1.0)), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * @param {object} THREE          動的 import した three 名前空間
 * @param {object} options
 * @param {object} options.camera 配置の基準にするカメラ (lookAt 済みであること)
 * @param {object} options.tuning TUNING オブジェクト (参照を保持して rebuild 時に読み直す)
 * @param {number} options.count  本数
 * @param {number} options.revealBand 点群と共通の波面の厚み
 * @param {boolean} options.motionless prefers-reduced-motion なら流れを止める
 */
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
    // 不透明・通常ブレンド・深度書き込みあり。点群 (depthWrite:false) より先に描かれ、
    // 線より奥の点は隠れ、手前の点は線の上に薄く染みる
    transparent: false,
    depthWrite: true,
    depthTest: true,
    // ビルボードで板の裏表が入れ替わるため両面描画にしておく
    side: THREE.DoubleSide,
  });

  const buildGeometry = (lineCount) => {
    const geometry = new THREE.InstancedBufferGeometry();

    // 基準の板: x が軸方向、y が幅方向の単位四角形
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
    // 距離 d における視錐台の高さ。長さ・太さ・速度はこれを基準にした「画面高さ比」で指定する
    const frustumHeightAt = (d) => 2 * d * Math.tan(fovRad / 2);

    // CSS の deg (負 = 右上がり) と揃えるため符号を反転してカメラ空間の角度にする
    const baseRad = (-tuning.lineAngleDeg * Math.PI) / 180;
    const jitterRad = (tuning.lineAngleJitterDeg * Math.PI) / 180;

    const tmpVec = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    for (let i = 0; i < n; i++) {
      // 奥行き: 手前に寄りすぎないよう DEPTH_BIAS で奥側へ寄せて分布させる
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

      // 画面の矩形を軸方向 / 軸と垂直な方向へ射影した長さ。
      // 軸方向は「画面を突き抜ける分 + 線の長さ」進めば確実に画面外なので、そこで巻き戻す。
      // 巻き戻し幅だけはリサイズで足りなくなると画面内で線が瞬間移動してしまうため、
      // 横長側に余裕を持たせた仮想アスペクトで計算しておく (狭い窓では単に遠くまで行くだけ)。
      const spanHalfW = halfH * Math.max(camera.aspect, WRAP_ASPECT);
      const alongExtent = 2 * (spanHalfW * cos + halfH * sin);
      const sideExtent = 2 * (halfW * sin + halfH * cos);
      const span = alongExtent + length * 1.2;

      // 軸方向の位置はシェーダの wrap が決めるので、ここでは軸と垂直な方向にだけ散らす
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

  // 生成時の本数とアスペクト。リサイズで画面の形が大きく変わったかの判定に使う
  let currentCount = Math.max(0, Math.round(count));
  let builtAspect = camera.aspect;

  const mesh = new THREE.Mesh(buildGeometry(currentCount), material);
  // 板はシェーダ側で動かすのでバウンディングボックスが当てにならない
  mesh.frustumCulled = false;
  // 点群 (renderOrder 1) より先に描いて深度を埋める
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

    // uniform で効く TUNING 項目を反映する (形状に焼き込む項目は rebuild が必要)
    applyTuning() {
      uniforms.uFog.value.set(tuning.lineFogNear, tuning.lineFogFar);
      uniforms.uBgColor.value.set(tuning.bgColor);
    },

    // 本数・角度・長さなどインスタンス属性に焼き込む項目が変わったら作り直す
    rebuild,

    // 画面の形が大きく変わったとき用。散らばりの範囲は生成時のアスペクトで焼き込んでいるので、
    // 縦長 <-> 横長のような変化では隅に線が来ない帯ができてしまう。
    // ただし作り直すと全線がワープするので、閾値を超えたときだけにする
    // (端末の回転やウィンドウの大幅なリサイズ程度の頻度。その場で再レイアウトも走るので目立たない)。
    handleResize() {
      const aspect = camera.aspect;
      if (aspect <= 0 || builtAspect <= 0) return;
      const ratio = Math.max(aspect / builtAspect, builtAspect / aspect);
      if (ratio > ASPECT_REBUILD_RATIO) rebuild();
    },

    // 点群から実測したリビール範囲 (log 距離) を共有する
    setRevealRange(near, far) {
      uniforms.uRevealRange.value.set(near, far);
    },

    // dt は ms。フレームレートを落としても流れる速さが変わらないよう時間ベースで積算する
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
