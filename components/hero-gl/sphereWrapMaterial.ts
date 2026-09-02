/**
 * @fileoverview Hero body shader. Catalog moons and Cymasphere wrap
 * the poster around the equator (front and back). CymaSynth is the
 * exception: polar stickers on ±Z that each span 3/4 of the globe
 * and crossfade in the overlap, on the oscillator-plate spin axis.
 * Hemisphere seams crossfade the square's left and right edges the
 * way the old strip bake did. Output is encoded so art is not left
 * linear-dark.
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
uniform float uCapMap;

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
  vec4 color;
  if (uCapMap > 0.5) {
    // Each pole's sticker covers 3/4 of the meridian (135°) so the
    // copies overlap; weights crossfade across that band.
    float thetaMax = 0.75 * PI;
    float thP = acos(clamp(n.z, -1.0, 1.0));
    float thM = PI - thP;
    float blendW = 2.0 * thetaMax - PI;
    float wP = 1.0 - smoothstep(thetaMax - blendW, thetaMax, thP);
    float wM = 1.0 - smoothstep(thetaMax - blendW, thetaMax, thM);
    float ang = atan(n.x, n.y) + uPhase * 2.0 * PI;
    vec2 spoke = vec2(sin(ang), cos(ang));
    float rP = clamp(thP / thetaMax, 0.0, 1.0);
    float rM = clamp(thM / thetaMax, 0.0, 1.0);
    vec4 plus = sampleArt(0.5 + 0.5 * rP * spoke);
    vec4 minus = sampleArt(0.5 + 0.5 * rM * (-spoke));
    color = (plus * wP + minus * wM) / max(wP + wM, 1e-5);
  } else {
    float lon = atan(n.x, n.z);
    float uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
    float srcU = fract(uStrip * 2.0 - 0.5);
    float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
    color = sampleArt(vec2(srcU, srcV));
    float seam = stripSeamBlend(uStrip);
    if (seam > 0.0) {
      vec4 pair = sampleArt(vec2(fract(1.0 - srcU), srcV));
      color = mix(color, pair, seam * 0.5);
    }
  }
  gl_FragColor = vec4(color.rgb, uOpacity);
  #include <colorspace_fragment>
}
`;

export interface SphereWrapOptions {
  /**
   * When true, two polar stickers on ±Z each span 3/4 of the globe
   * and blend in the overlap (CymaSynth). The mesh should carry the
   * oscillator-plate tilt so ±Z is the ring spin axis. Default wraps
   * front / back around Y.
   */
  capMap?: boolean;
}

/**
 * @brief Shader that wraps square art onto the globe.
 * @param map Artwork texture.
 * @param options {@link SphereWrapOptions.capMap} for CymaSynth caps.
 * @returns Prelit wrap material.
 * @note Cap wrap: each pole covers 135° and the pair crossfades in
 * the 90° overlap so the flower reads as one blended globe.
 * @example
 * createSphereWrapMaterial(tex)
 * createSphereWrapMaterial(tex, { capMap: true })
 */
export function createSphereWrapMaterial(
  map: Texture,
  options: SphereWrapOptions = {}
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uOpacity: { value: 1 },
      uCapMap: { value: options.capMap ? 1 : 0 },
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
