/**
 * @fileoverview Hero body shader. Every planet uses the same longitude
 * wrap and prelit poster so Cymasphere, CymaSynth, and catalog moons
 * differ only by mesh scale. Hemisphere seams crossfade the square's
 * left and right edges the way the old strip bake did. Output is
 * encoded so art is not left linear-dark.
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
#include <common>

uniform sampler2D uMap;
uniform float uPhase;
uniform float uOpacity;

varying vec3 vObjectPos;

vec4 sampleArt(vec2 uv) {
  // Lod 0: fract(U) makes implicit mips pick a 1px colored seam.
  return texture2DLodEXT(uMap, uv, 0.0);
}

// Matches stripSeamBlend: 1 at either hemisphere join, 0 by 7% in.
float stripSeamBlend(float u) {
  float seamD = min(abs(u - 0.25), abs(u - 0.75));
  float t = clamp(1.0 - seamD / 0.07, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  vec3 n = normalize(vObjectPos);
  float lon = atan(n.x, n.z);
  float uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
  float srcU = fract(uStrip * 2.0 - 0.5);
  float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
  vec4 color = sampleArt(vec2(srcU, srcV));
  float seam = stripSeamBlend(uStrip);
  if (seam > 0.0) {
    vec4 pair = sampleArt(vec2(fract(1.0 - srcU), srcV));
    color = mix(color, pair, seam * 0.5);
  }
  gl_FragColor = vec4(color.rgb, uOpacity);
  #include <colorspace_fragment>
}
`;

/**
 * @brief Shader that wraps square art onto the globe. Same look for
 * every body; callers only change mesh scale.
 * @param map Artwork texture.
 */
export function createSphereWrapMaterial(map: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: true,
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

/**
 * @brief Sets wrap alpha so moons can fade instead of popping.
 * @param material Wrap shader.
 * @param opacity 0–1.
 */
export function setSphereWrapOpacity(
  material: ShaderMaterial,
  opacity: number
): void {
  const uniform = material.uniforms.uOpacity;
  const o = Math.min(1, Math.max(0, opacity));
  if (uniform) uniform.value = o;
  const solid = o >= 0.99;
  material.transparent = !solid;
  material.depthWrite = solid;
}
