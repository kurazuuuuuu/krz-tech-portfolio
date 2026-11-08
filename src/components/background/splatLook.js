const VEIL_COLOR = "#d5f2df";
const VEIL_AMOUNT = 0.55;
const FOG_NEAR = 6;
const FOG_FAR = 45;

const glslFloat = (value) => value.toFixed(4);
const glslVec3 = (values) => `vec3(${values.map(glslFloat).join(", ")})`;
const glslColor = (hex) => glslVec3(hex.match(/\w\w/g).map((pair) => parseInt(pair, 16) / 255));

export const createSplatLook = (
  { dyno },
  { viewOrigin, backgroundColor, revealRange, revealBand, initialRevealFront },
) => {
  const front = dyno.dynoFloat(initialRevealFront);

  const shade = new dyno.Dyno({
    inTypes: { gsplat: dyno.Gsplat, front: "float" },
    outTypes: { gsplat: dyno.Gsplat },
    statements: ({ inputs, outputs }) =>
      dyno.unindentLines(`
        ${outputs.gsplat} = ${inputs.gsplat};
        {
          float dist = distance(${inputs.gsplat}.center, ${glslVec3(viewOrigin)});
          float fog = smoothstep(${glslFloat(FOG_NEAR)}, ${glslFloat(FOG_FAR)}, dist);
          vec3 rgb = mix(${inputs.gsplat}.rgba.rgb, ${glslColor(VEIL_COLOR)}, ${glslFloat(VEIL_AMOUNT)});
          rgb = mix(rgb, ${glslColor(backgroundColor)}, fog);

          float near = ${glslFloat(revealRange.near)};
          float far = ${glslFloat(revealRange.far)};
          float t = clamp((log(max(dist, 0.001)) - near) / (far - near), 0.0, 1.0);
          float passed = clamp((${inputs.front} - t) / ${glslFloat(revealBand)}, 0.0, 1.0);
          float revealed = 1.0 - (1.0 - passed) * (1.0 - passed);

          ${outputs.gsplat}.rgba = vec4(rgb, ${inputs.gsplat}.rgba.a * revealed);
        }
      `),
  });

  const worldModifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => ({ gsplat: shade.apply({ gsplat, front }).gsplat }),
  );

  return {
    worldModifier,
    setRevealFront(value) {
      front.value = value;
    },
  };
};
