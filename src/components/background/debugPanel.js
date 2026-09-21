/**
 * `?debug` が付いているときだけ表示する背景の調整パネル。
 *
 * three 同梱の lil-gui を使う (新規依存なし)。このモジュール自体が
 * GaussianSplatBackground.vue から動的 import されるので、`?debug` が無い場合は
 * lil-gui もろとも本番の初期ロードに乗らない。
 *
 * 調整した値は「値をコピー」で TUNING と同じ形の JSON になる。
 * それを TUNING の既定値へ貼り戻す運用。
 */
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

/**
 * @param {object} options
 * @param {object} options.tuning  TUNING オブジェクト (コントローラが直接書き換える)
 * @param {string} options.quality 'high' | 'medium' | 'low' (線の本数はこのキーの値を編集する)
 * @param {() => void} options.apply   uniform に反映できる値が変わったとき
 * @param {() => void} options.rebuild 線のインスタンス属性に焼き込む値が変わったとき
 */
export const createDebugPanel = ({ tuning, quality, apply, rebuild }) => {
  const gui = new GUI({ title: "背景チューニング (?debug)" });

  const points = gui.addFolder("点群 (インク)");
  points.add(tuning, "inkDensity", 0.05, 1.0, 0.005).name("濃度").onChange(apply);
  points.add(tuning, "pointSizeScale", 0.3, 5, 0.05).name("点サイズ倍率").onChange(apply);
  points.add(tuning, "pointSoftness", 0, 1, 0.01).name("縁のぼかし").onChange(apply);
  points.addColor(tuning, "colorA").name("色A (ビビッド)").onChange(apply);
  points.addColor(tuning, "colorB").name("色B (ミント)").onChange(apply);
  points
    .add(tuning, "brightnessMode", { 明るい所ほど濃い: 1, 暗い所ほど濃い: 0 })
    .name("輝度→濃度")
    .onChange(apply);
  points.add(tuning, "brightnessInfluence", 0, 1, 0.01).name("輝度の効き").onChange(apply);
  points.add(tuning, "fogNear", 0, 60, 0.5).name("フォグ near (奥行き)").onChange(apply);
  points.add(tuning, "fogFar", 0, 60, 0.5).name("フォグ far (奥行き)").onChange(apply);
  points.add(tuning, "refPointPx", 0, 8, 0.1).name("大粒の抑制 基準px").onChange(apply);
  points.add(tuning, "repelStrength", 0, 0.3, 0.005).name("マウス斥力").onChange(apply);
  points.add(tuning, "wobbleStrength", 0, 0.05, 0.001).name("wobble").onChange(apply);
  points.add(tuning, "parallaxScale", 0, 3, 0.05).name("パララックス量").onChange(apply);

  const lines = gui.addFolder("スピード線");
  lines.add(tuning.lineCount, quality, 0, 80, 1).name(`本数 (${quality})`).onChange(rebuild);
  lines.add(tuning, "lineAngleDeg", -90, 90, 0.5).name("基準角 (CSS deg)").onChange(rebuild);
  lines.add(tuning, "lineAngleJitterDeg", 0, 30, 0.5).name("角度ばらつき").onChange(rebuild);
  lines.add(tuning, "lineLengthMin", 0.01, 1, 0.005).name("長さ min").onChange(rebuild);
  lines.add(tuning, "lineLengthMax", 0.01, 1.5, 0.005).name("長さ max").onChange(rebuild);
  lines.add(tuning, "lineWidthMin", 0.0002, 0.03, 0.0002).name("太さ min").onChange(rebuild);
  lines.add(tuning, "lineWidthMax", 0.0002, 0.03, 0.0002).name("太さ max").onChange(rebuild);
  lines.add(tuning, "lineSpeedMin", 0, 0.5, 0.005).name("速度 min").onChange(rebuild);
  lines.add(tuning, "lineSpeedMax", 0, 0.5, 0.005).name("速度 max").onChange(rebuild);
  lines.add(tuning, "lineDepthNear", 0.2, 10, 0.1).name("奥行き near").onChange(rebuild);
  lines.add(tuning, "lineDepthFar", 0.5, 40, 0.1).name("奥行き far").onChange(rebuild);
  lines.add(tuning, "lineFogNear", 0, 12, 0.1).name("線フォグ near (奥行き)").onChange(apply);
  lines.add(tuning, "lineFogFar", 0, 12, 0.1).name("線フォグ far (奥行き)").onChange(apply);

  const lineColors = lines.addFolder("線の色");
  for (const key of Object.keys(tuning.lineColors)) {
    lineColors.addColor(tuning.lineColors, key).name(key).onChange(rebuild);
  }
  const lineWeights = lines.addFolder("線の色配分 (相対重み)");
  for (const key of Object.keys(tuning.lineColorWeights)) {
    lineWeights.add(tuning.lineColorWeights, key, 0, 100, 1).name(key).onChange(rebuild);
  }

  const background = gui.addFolder("背景 / 描画");
  background.addColor(tuning, "bgColor").name("背景色 (body と揃える)").onChange(apply);
  // リビール完了後のフレームレート。流れる線のカクつきと GPU 負荷のトレードオフを実機で決める
  background
    .add(tuning, "idleFps", { "30fps (省電力)": 30, "60fps (滑らか)": 60 })
    .name("待機時 fps");

  // TUNING と同じ形の JSON を書き出す。焼き込み直すときはこれを貼り替える
  const actions = {
    copy() {
      const json = JSON.stringify(tuning, null, 2);
      const fallback = () => console.log("[GaussianSplatBackground] TUNING:\n" + json);
      try {
        navigator.clipboard
          .writeText(json)
          .then(() =>
            console.log("[GaussianSplatBackground] TUNING をクリップボードにコピーしました"),
          )
          .catch(fallback);
      } catch {
        fallback();
      }
    },
  };
  gui.add(actions, "copy").name("値をコピー (JSON)");

  return {
    destroy() {
      gui.destroy();
    },
  };
};
