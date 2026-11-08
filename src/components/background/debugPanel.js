import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export const createDebugPanel = ({ tuning, quality, apply, rebuild }) => {
  const gui = new GUI({ title: "背景チューニング (?debug)" });

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
  background.add(tuning, "parallaxScale", 0, 3, 0.05).name("パララックス量");
  background
    .add(tuning, "idleFps", { "30fps (省電力)": 30, "60fps (滑らか)": 60 })
    .name("待機時 fps");

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
