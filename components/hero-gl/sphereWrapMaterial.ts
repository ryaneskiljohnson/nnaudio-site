/**
 * @fileoverview Hero body shader. Catalog moons use the same longitude /
 * latitude map as stripUFrac / stripV so square art rolls around the
 * globe. Sun and CymaSynth posters are already painted spheres, so those
 * use a circular crop. A camera-key fill keeps the facing disk readable.
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
uniform float uPlanar;
uniform float uOpacity;

varying vec3 vObjectPos;

const float PI = 3.141592653589793;

void main() {
  vec3 n = normalize(vObjectPos);
  vec4 color;
  if (uPlanar > 0.5) {
    float angle = uPhase * 2.0 * PI;
    float c = cos(angle);
    float s = sin(angle);
    vec2 disk = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
    color = texture2D(uMap, disk * 0.5 + 0.5);
  } else {
    float lon = atan(n.x, n.z);
    float uStrip = fract(0.5 + lon / (2.0 * PI) + uPhase);
    float srcU = fract(uStrip * 2.0 - 0.5);
    float srcV = 0.5 + asin(clamp(n.y, -1.0, 1.0)) / PI;
    color = texture2D(uMap, vec2(srcU, srcV));
    if (uSurfaceShade > 0.5) {
      float lit = 0.82 + 0.18 * cos((uStrip - 0.5) * 2.0 * PI);
      color.rgb *= lit;
    }
  }
  // Billboard +Z faces the camera. Keep the disk in the light.
  float facing = mix(0.95, 1.2, max(0.0, n.z));
  float key = clamp(uCamFill, 0.0, 1.0);
  color.rgb *= mix(1.0, facing, key);
  gl_FragColor = vec4(color.rgb, uOpacity);
}
`;

/**
 * @brief Shader that wraps square art onto the camera-facing globe.
 * @param map Artwork texture.
 * @param surfaceShade When true, a lit meridian rotates with catalog art.
 * @param planar When true, crop the poster as a disk (painted-sphere photos).
 */
export function createSphereWrapMaterial(
  map: Texture,
  surfaceShade = true,
  planar = false
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uSurfaceShade: { value: surfaceShade ? 1 : 0 },
      uCamFill: { value: 1 },
      uPlanar: { value: planar ? 1 : 0 },
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
  material.transparent = true;
  material.depthWrite = o > 0.94;
}
