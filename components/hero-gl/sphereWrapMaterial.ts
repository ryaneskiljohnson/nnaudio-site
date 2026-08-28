/**
 * @fileoverview Catalog-moon wrap: samples square artwork with the same
 * longitude / latitude map as stripUFrac / stripV so the face shows the
 * full image at phase 0 and rolls as the moon spins.
 * @module components/hero-gl/sphereWrapMaterial
 */

import { ShaderMaterial, type Texture } from "three";

const VERT = /* glsl */ `
varying vec3 vObjectPos;
varying vec3 vViewNormal;

void main() {
  vObjectPos = position;
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uPhase;
uniform float uSurfaceShade;
uniform float uCamFill;

varying vec3 vObjectPos;
varying vec3 vViewNormal;

const float PI = 3.141592653589793;

void main() {
  vec3 n = normalize(vObjectPos);
  float lon = atan(n.x, n.z);
  float uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
  float srcU = fract(uStrip * 2.0 - 0.5);
  float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
  vec4 color = texture2D(uMap, vec2(srcU, srcV));
  if (uSurfaceShade > 0.5) {
    float lit = 0.82 + 0.18 * cos((uStrip - 0.5) * 2.0 * PI);
    color.rgb *= lit;
  }
  // Camera key: multiply AND add so dark posters still read as a globe.
  float facing = max(0.0, normalize(vViewNormal).z);
  float key = clamp(uCamFill, 0.0, 1.0);
  color.rgb *= mix(1.0, 0.62 + 0.55 * facing, key);
  color.rgb += vec3(0.32, 0.28, 0.42) * facing * key;
  gl_FragColor = vec4(color.rgb, 1.0);
}
`;

/**
 * @brief Shader that wraps a square texture onto a sphere like the old bake.
 * @param map Artwork texture.
 * @param surfaceShade When true, a lit meridian rotates with the art.
 */
export function createSphereWrapMaterial(
  map: Texture,
  surfaceShade = true
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uSurfaceShade: { value: surfaceShade ? 1 : 0 },
      uCamFill: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    toneMapped: false,
  });
}

/**
 * @brief Advances the wrap spin (0–1 revolution).
 * @param material Wrap shader.
 * @param phase Spin phase in [0, 1).
 */
export function setSphereWrapPhase(
  material: ShaderMaterial,
  phase: number
): void {
  const uniform = material.uniforms.uPhase;
  if (uniform) uniform.value = ((phase % 1) + 1) % 1;
}
