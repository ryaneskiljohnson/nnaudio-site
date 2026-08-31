/**
 * @fileoverview Hero body shader. Catalog moons use the longitude /
 * latitude map so art rolls around the globe, with a camera wrap and
 * self-glow (no specular hot-spot). Cymasphere uses the same wrap roll
 * but stays prelit so the poster colors are not relit. Output is
 * encoded so art is not left linear-dark.
 * @module components/hero-gl/sphereWrapMaterial
 */

import { ShaderMaterial, type Texture } from "three";

const VERT = /* glsl */ `
varying vec3 vObjectPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vObjectPos = position;
  vWorldNormal = normalize(mat3(modelMatrix) * position);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
#include <common>

uniform sampler2D uMap;
uniform float uPhase;
uniform float uSurfaceShade;
uniform float uCamFill;
uniform float uPlanar;
uniform float uOpacity;
uniform float uWarmRim;
uniform float uPrelit;

varying vec3 vObjectPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vObjectPos);
  vec4 color;
  float uStrip = 0.5;
  if (uPlanar > 0.5) {
    float angle = uPhase * 2.0 * PI;
    float c = cos(angle);
    float s = sin(angle);
    vec2 disk = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
    color = texture2D(uMap, disk * 0.5 + 0.5);
  } else {
    float lon = atan(n.x, n.z);
    uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
    float srcU = fract(uStrip * 2.0 - 0.5);
    float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
    color = texture2D(uMap, vec2(srcU, srcV));
  }
  vec3 albedo = color.rgb;
  if (uPrelit < 0.5 && uPlanar < 0.5) {
    albedo *= mix(1.08, 1.02, uWarmRim);
    if (uSurfaceShade > 0.5) {
      float lit = 0.88 + 0.12 * cos((uStrip - 0.5) * 2.0 * PI);
      albedo *= lit;
    }

    vec3 nW = normalize(vWorldNormal);
    vec3 towardCam = normalize(cameraPosition - vWorldPos);
    float ndotl = max(0.0, dot(nW, towardCam));
    float facing = mix(0.94, 1.08, ndotl);
    float key = clamp(uCamFill, 0.0, 1.0);
    albedo *= mix(1.0, facing, key * (1.0 - 0.35 * uWarmRim));

    float luma = dot(albedo, vec3(0.299, 0.587, 0.114));
    float glow = clamp(0.20 - luma, 0.0, 0.20);
    albedo += mix(vec3(0.14, 0.15, 0.18), vec3(0.10, 0.07, 0.045), uWarmRim) * glow;
    float fres = pow(1.0 - ndotl, 2.6);
    vec3 rim = mix(vec3(0.50, 0.62, 0.82), vec3(1.0, 0.86, 0.62), uWarmRim);
    albedo += rim * fres * mix(0.07, 0.04, uWarmRim);
  }

  gl_FragColor = vec4(albedo, uOpacity);
  #include <colorspace_fragment>
}
`;

/**
 * @brief Shader that wraps square art onto the camera-facing globe.
 * @param map Artwork texture.
 * @param surfaceShade When true, a lit meridian rotates with catalog art.
 * @param planar Unused at runtime; moons and Cymasphere both wrap.
 * @param prelit Skip wrap lighting so a painted poster stays as-authored.
 */
export function createSphereWrapMaterial(
  map: Texture,
  surfaceShade = true,
  planar = false,
  prelit = false
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uSurfaceShade: { value: surfaceShade ? 1 : 0 },
      uCamFill: { value: 1 },
      uPlanar: { value: planar ? 1 : 0 },
      uOpacity: { value: 1 },
      uWarmRim: { value: 0 },
      uPrelit: { value: prelit ? 1 : 0 },
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
