/**
 * @fileoverview Camera-facing disk wrap for hero posters. The visible
 * hemisphere shows a circular crop of the square artwork (the old CSS
 * billboard disk). Phase spins that crop in the plane of the disk.
 * @module components/hero-gl/sphereWrapMaterial
 */

import { ShaderMaterial, type Texture } from "three";

const VERT = /* glsl */ `
varying vec3 vObjectPos;

void main() {
  vObjectPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uPhase;
uniform float uSurfaceShade;
uniform float uCamFill;

varying vec3 vObjectPos;

const float PI = 3.141592653589793;

void main() {
  vec3 n = normalize(vObjectPos);
  float angle = uPhase * 2.0 * PI;
  float c = cos(angle);
  float s = sin(angle);
  vec2 disk = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
  vec2 uv = disk * 0.5 + 0.5;
  vec4 color = texture2D(uMap, uv);
  if (uSurfaceShade > 0.5) {
    float lit = 0.88 + 0.12 * max(0.0, n.z);
    color.rgb *= lit;
  }
  // Camera directional: the disk faces the viewer after billboard.
  // Keep a high floor so dark posters and silhouette pixels stay readable.
  float facing = mix(0.82, 1.12, max(0.0, n.z));
  float key = clamp(uCamFill, 0.0, 1.0);
  color.rgb *= mix(1.0, facing, key);
  color.rgb += vec3(0.10, 0.09, 0.14) * key;
  gl_FragColor = vec4(color.rgb, 1.0);
}
`;

/**
 * @brief Shader that puts square art on the camera-facing disk.
 * @param map Artwork texture.
 * @param surfaceShade When true, a little limb falloff on catalog moons.
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
