/**
 * @fileoverview Hero body shader. Every planet uses the same longitude
 * wrap, UV pad, and prelit poster so Cymasphere, CymaSynth, and catalog
 * moons differ only by mesh scale. Output is encoded so art is not
 * left linear-dark.
 * @module components/hero-gl/sphereWrapMaterial
 */

import { ShaderMaterial, type Texture } from "three";

/**
 * Black frame around wrap art, as a fraction of each side.
 * Latitude uses asin, so a small UV pad vanishes at the poles;
 * 0.16 keeps the art on the globe's belly.
 */
export const HERO_WRAP_PAD_FRAC = 0.16;

/**
 * @brief Maps sphere UVs into the art rect, or marks the black frame.
 * @param u Longitude sample in [0, 1].
 * @param v Latitude sample in [0, 1].
 * @param padFrac Border on each side.
 * @example
 * heroWrapPadUv(0.5, 0.5, 0.1) // { u: 0.5, v: 0.5, outside: false }
 * heroWrapPadUv(0.02, 0.5, 0.1) // outside: true
 */
export function heroWrapPadUv(
  u: number,
  v: number,
  padFrac: number = HERO_WRAP_PAD_FRAC
): { u: number; v: number; outside: boolean } {
  const pad = Math.min(0.4, Math.max(0, padFrac));
  const span = Math.max(1e-4, 1 - 2 * pad);
  const iu = (u - pad) / span;
  const iv = (v - pad) / span;
  return {
    u: iu,
    v: iv,
    outside: iu < 0 || iu > 1 || iv < 0 || iv > 1,
  };
}

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
uniform float uPad;

varying vec3 vObjectPos;

vec4 samplePadded(vec2 uv) {
  float pad = clamp(uPad, 0.0, 0.4);
  float span = max(1e-4, 1.0 - 2.0 * pad);
  vec2 inner = (uv - pad) / span;
  if (inner.x < 0.0 || inner.x > 1.0 || inner.y < 0.0 || inner.y > 1.0) {
    return vec4(0.0);
  }
  // Lod 0: fract(U) makes implicit mips pick a 1px colored seam.
  return texture2DLodEXT(uMap, inner, 0.0);
}

void main() {
  vec3 n = normalize(vObjectPos);
  float lon = atan(n.x, n.z);
  float uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
  float srcU = fract(uStrip * 2.0 - 0.5);
  float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
  vec4 color = samplePadded(vec2(srcU, srcV));
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
      uPad: { value: HERO_WRAP_PAD_FRAC },
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
