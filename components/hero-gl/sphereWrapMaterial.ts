/**
 * @fileoverview Hero body shader. Square art uses the same longitude /
 * latitude map as stripUFrac / stripV so the mark rolls around the
 * globe. The key sits left and above the camera so the highlight is
 * not dead-on. A fill, soft spec, and fresnel rim keep the facing disk
 * readable. uPlanar stays as a dead uniform (source contract).
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
uniform sampler2D uMap;
uniform float uPhase;
uniform float uSurfaceShade;
uniform float uCamFill;
uniform float uPlanar;
uniform float uOpacity;
uniform float uWarmRim;

varying vec3 vObjectPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

const float PI = 3.141592653589793;

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
  vec3 albedo = color.rgb * mix(1.08, 1.02, uWarmRim);
  if (uSurfaceShade > 0.5) {
    float lit = 0.88 + 0.12 * cos((uStrip - 0.5) * 2.0 * PI);
    albedo *= lit;
  }

  vec3 nW = normalize(vWorldNormal);
  vec3 toCam = cameraPosition - vWorldPos;
  vec3 towardCam = normalize(toCam);
  vec3 forward = -towardCam;
  vec3 worldUp = vec3(0.0, 1.0, 0.0);
  vec3 right = cross(forward, worldUp);
  float rightLen = length(right);
  right = rightLen > 0.001 ? right / rightLen : vec3(1.0, 0.0, 0.0);
  vec3 up = normalize(cross(right, forward));
  // Key from camera-left and above so the spec sits off-center.
  vec3 L = normalize(towardCam - right * 0.55 + up * 0.38);
  float ndotl = max(0.0, dot(nW, L));
  float facing = mix(1.04, 1.22, ndotl);
  float key = clamp(uCamFill, 0.0, 1.0);
  albedo *= mix(1.0, facing, key * (1.0 - 0.7 * uWarmRim));
  albedo *= mix(0.92 + 0.10 * ndotl, 0.96 + 0.06 * ndotl, uWarmRim);

  float specTight = pow(ndotl, 40.0) * mix(0.32, 0.16, uWarmRim);
  float specSoft = pow(ndotl, 10.0) * mix(0.10, 0.03, uWarmRim);
  albedo += (specTight + specSoft) * mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 0.92, 0.78), uWarmRim);
  float luma = dot(albedo, vec3(0.299, 0.587, 0.114));
  float lift = clamp(0.22 - luma, 0.0, 0.22) * ndotl / 0.22;
  albedo += mix(vec3(0.08, 0.09, 0.12), vec3(0.03, 0.02, 0.015), uWarmRim) * lift;
  float fres = pow(1.0 - ndotl, 2.2);
  vec3 rim = mix(vec3(0.55, 0.72, 0.95), vec3(1.0, 0.86, 0.62), uWarmRim);
  albedo += rim * fres * mix(0.16, 0.08, uWarmRim);

  gl_FragColor = vec4(albedo, uOpacity);
}
`;

/**
 * @brief Shader that wraps square art onto the camera-facing globe.
 * @param map Artwork texture.
 * @param surfaceShade When true, a lit meridian rotates with catalog art.
 * @param planar Kept for the source contract; runtime always passes false.
 * @param warmRim Gold/violet limb on Cymasphere; cooler on moons.
 */
export function createSphereWrapMaterial(
  map: Texture,
  surfaceShade = true,
  planar = false,
  warmRim = false
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uPhase: { value: 0 },
      uSurfaceShade: { value: surfaceShade ? 1 : 0 },
      uCamFill: { value: 1 },
      uPlanar: { value: planar ? 1 : 0 },
      uOpacity: { value: 1 },
      uWarmRim: { value: warmRim ? 1 : 0 },
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
