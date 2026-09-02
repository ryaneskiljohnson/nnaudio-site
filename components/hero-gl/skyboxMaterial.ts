/**
 * @fileoverview Two far-plane layers from the Cymasphere Android shaders:
 * DynamicStarsSkybox behind, Nebula as its own transparent pass.
 * Both sample a world-space view ray so the sky surrounds the tour.
 * @module components/hero-gl/skyboxMaterial
 */

import {
  AdditiveBlending,
  Color,
  Group,
  Matrix4,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type Camera,
  type Object3D,
} from "three";

const VERT = /* glsl */ `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

const GLSL_COMMON = /* glsl */ `
#include <common>

varying vec2 vNdc;
uniform mat4 uInvProj;
uniform mat4 uViewToLocal;

float hlslFmod(float x, float y) {
  return x - y * (x < 0.0 ? ceil(x / y) : floor(x / y));
}

vec2 hlslFmod2(vec2 x, float y) {
  return vec2(hlslFmod(x.x, y), hlslFmod(x.y, y));
}

vec3 skyDir() {
  vec4 viewH = uInvProj * vec4(vNdc, 1.0, 1.0);
  vec3 viewDir = normalize(viewH.xyz / max(viewH.w, 1e-6));
  return normalize(mat3(uViewToLocal) * viewDir);
}

vec2 skyEquirect(vec3 d) {
  return vec2(atan(d.x, -d.z), d.y);
}
`;

const STARS_FRAG = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uStars;
uniform float uStarCount;
uniform float uCellDensity;
uniform vec2 uTiling;

vec2 unityVoronoiRandom(vec2 uv, float offset) {
  mat2 m = mat2(15.27, 47.63, 99.41, 89.98);
  uv = fract(sin(m * uv) * 46839.32);
  return vec2(sin(uv.y * offset) * 0.5 + 0.5, cos(uv.x * offset) * 0.5 + 0.5);
}

float unityVoronoi(vec2 uv, float angleOffset, float cellDensity) {
  vec2 g = floor(uv * cellDensity);
  vec2 f = fract(uv * cellDensity);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 lattice = vec2(float(x), float(y));
      vec2 offset = unityVoronoiRandom(lattice + g, angleOffset);
      md = min(md, distance(lattice + offset, f));
    }
  }
  return md;
}

vec3 sampleStarColors(float t) {
  t = saturate(t);
  vec3 c0 = vec3(1.0, 0.25, 0.25);
  vec3 c1 = vec3(1.0, 1.0, 1.0);
  vec3 c2 = vec3(0.3726415, 0.4661303, 1.0);
  vec3 c3 = vec3(0.9433962, 0.4227483, 0.4585008);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.75) return mix(c1, c2, (t - 0.25) / 0.5);
  return mix(c2, c3, (t - 0.75) / 0.25);
}

void main() {
  vec2 starUv = skyEquirect(skyDir()) * uTiling;
  float cells = unityVoronoi(starUv, uStars, uCellDensity);
  vec2 cellId = floor(starUv * uCellDensity);
  float pick = fract(sin(dot(cellId, vec2(127.1, 311.7))) * 43758.5453);
  float colorT = fract(sin(dot(cellId, vec2(269.5, 183.3))) * 43758.5453);
  float star = pow(saturate(1.0 - cells * 13.0), 6.0);
  star *= step(0.980, pick);
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.7 + pick * 1.4) + pick * 40.0);
  vec3 rgb = sampleStarColors(colorT) * twinkle * star;
  gl_FragColor = vec4(rgb, 1.0);
  #include <colorspace_fragment>
}
`;

const NEBULA_FRAG = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uTimeOffset;
uniform float uScale;
uniform float uSpeed;
uniform float uIntensity;
uniform float uNegativeSpace;
uniform vec3 uBodyColor;
uniform vec3 uEdgeColor;

vec2 unityGradientNoiseDir(vec2 p) {
  p = hlslFmod2(p, 289.0);
  float x = hlslFmod((34.0 * p.x + 1.0) * p.x, 289.0) + p.y;
  x = hlslFmod((34.0 * x + 1.0) * x, 289.0);
  x = fract(x / 41.0) * 2.0 - 1.0;
  vec2 n = vec2(x - floor(x + 0.5), abs(x) - 0.5);
  return n / max(length(n), 1e-6);
}

float unityGradientNoise(vec2 uv, float scale) {
  vec2 p = uv * scale;
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float d00 = dot(unityGradientNoiseDir(ip), fp);
  float d01 = dot(unityGradientNoiseDir(ip + vec2(0.0, 1.0)), fp - vec2(0.0, 1.0));
  float d10 = dot(unityGradientNoiseDir(ip + vec2(1.0, 0.0)), fp - vec2(1.0, 0.0));
  float d11 = dot(unityGradientNoiseDir(ip + vec2(1.0, 1.0)), fp - vec2(1.0, 1.0));
  fp = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  return mix(mix(d00, d01, fp.y), mix(d10, d11, fp.y), fp.x) + 0.5;
}

vec3 sampleNebulaGradient(float t) {
  t = saturate(t);
  vec3 blue = vec3(0.0, 0.184, 0.984);
  vec3 violet = vec3(0.550, 0.220, 0.980);
  vec3 teal = vec3(0.0, 0.62, 0.92);
  if (t < 0.45) return mix(blue, violet, t / 0.45);
  return mix(violet, teal, (t - 0.45) / 0.55);
}

void main() {
  vec2 uv = skyEquirect(skyDir()) * vec2(0.82, 0.52);
  float drift = (uTimeOffset + uTime) * uSpeed * 0.0036;
  vec2 warp = vec2(
    unityGradientNoise(uv + vec2(drift * 0.18, -drift * 0.11), uScale * 0.035),
    unityGradientNoise(uv + vec2(-drift * 0.14, drift * 0.16), uScale * 0.035)
  ) - 0.5;
  vec2 p = uv + warp * 0.22;
  float n1 = unityGradientNoise(p + vec2(drift * 0.28, -drift * 0.12), uScale * 0.038);
  float n2 = unityGradientNoise(p + vec2(0.62, -0.38) + vec2(-drift * 0.16, drift * 0.24), uScale * 0.044);
  float n3 = unityGradientNoise(p + vec2(-0.41, 0.57) + vec2(drift * 0.11, -drift * 0.19), uScale * 0.05);
  float cutoff = 0.58 + uNegativeSpace * 0.03;
  float gain = uIntensity * 0.55;
  float blobA = pow(saturate((n1 - cutoff) * gain), 1.75);
  float blobB = pow(saturate((n2 - (cutoff - 0.02)) * gain), 1.75);
  float blobC = pow(saturate((n3 - (cutoff + 0.05)) * gain), 1.85);
  float cloud = max(blobA, max(blobB * 0.92, blobC * 0.7));
  float centerTop = (1.0 - smoothstep(0.20, 0.74, abs(vNdc.x))) *
    smoothstep(-0.08, 0.70, vNdc.y);
  cloud *= 1.0 - centerTop * 0.96;
  float swirl = saturate(n2);
  vec3 tinted = mix(uEdgeColor, uBodyColor, swirl);
  vec3 rgb = (tinted * 0.08 + sampleNebulaGradient(swirl) * 0.018) * cloud;
  gl_FragColor = vec4(rgb, 1.0);
  #include <colorspace_fragment>
}
`;

const INV_PROJ = new Matrix4();
const INV_WORLD = new Matrix4();
const VIEW_TO_LOCAL = new Matrix4();

const AFTERGLOW = [
  0x002ffb, 0xe869ee, 0xf60f6d, 0x7112ea, 0x0563ff, 0xb907e1, 0x92236f,
];
const AFTERGLOW_A = new Color();
const AFTERGLOW_B = new Color();
const AFTERGLOW_CYCLE_SEC = 18;

function farLayer(
  name: string,
  material: ShaderMaterial,
  renderOrder: number
): Mesh {
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/**
 * @brief Stars skybox plus a separate nebula plate, matching Android's two passes.
 */
export function createHeroSkybox(): Group {
  const nebula = farLayer(
    "hero-nebula",
    new ShaderMaterial({
      name: "hero-nebula",
      uniforms: {
        uTime: { value: 0 },
        uTimeOffset: { value: 17 },
        uScale: { value: 40 },
        uSpeed: { value: 5 },
        uIntensity: { value: 10 },
        uNegativeSpace: { value: 2 },
        uBodyColor: { value: new Color(0xe869ee) },
        uEdgeColor: { value: new Color(0x002ffb) },
        uInvProj: { value: new Matrix4() },
        uViewToLocal: { value: new Matrix4() },
      },
      vertexShader: VERT,
      fragmentShader: NEBULA_FRAG,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
    -21
  );
  const stars = farLayer(
    "hero-stars",
    new ShaderMaterial({
      name: "hero-stars",
      uniforms: {
        uTime: { value: 0 },
        uStars: { value: 150 },
        uStarCount: { value: 135 },
        uCellDensity: { value: 30.55 },
        uTiling: { value: new Vector2(8, 4) },
        uInvProj: { value: new Matrix4() },
        uViewToLocal: { value: new Matrix4() },
      },
      vertexShader: VERT,
      fragmentShader: STARS_FRAG,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
    -20
  );
  const group = new Group();
  group.name = "hero-skybox";
  group.add(nebula);
  group.add(stars);
  return group;
}

/**
 * @brief Advances star twinkle and aims both sky passes in world space.
 * The tour camera is fixed; `world` carries the orbit, so sky directions
 * use inv(world) × camera so the field surrounds the solar system.
 * @param root {@link createHeroSkybox} result.
 * @param camera Active tour camera.
 * @param world Kepler world group that receives the tour matrix.
 * @param timeSec Elapsed seconds.
 */
export function poseHeroSkybox(
  root: Object3D,
  camera: Camera,
  world: Object3D,
  timeSec: number
): void {
  const stars = root.getObjectByName("hero-stars") as Mesh | undefined;
  const nebula = root.getObjectByName("hero-nebula") as Mesh | undefined;
  if (!stars) return;
  camera.updateMatrixWorld(true);
  world.updateMatrixWorld(true);
  INV_PROJ.copy(camera.projectionMatrix).invert();
  INV_WORLD.copy(world.matrixWorld).invert();
  VIEW_TO_LOCAL.multiplyMatrices(INV_WORLD, camera.matrixWorld);
  const starMat = stars.material as ShaderMaterial;
  starMat.uniforms.uTime.value = timeSec;
  starMat.uniforms.uInvProj.value.copy(INV_PROJ);
  starMat.uniforms.uViewToLocal.value.copy(VIEW_TO_LOCAL);
  if (nebula) {
    const nebulaMat = nebula.material as ShaderMaterial;
    nebulaMat.uniforms.uTime.value = timeSec;
    nebulaMat.uniforms.uInvProj.value.copy(INV_PROJ);
    nebulaMat.uniforms.uViewToLocal.value.copy(VIEW_TO_LOCAL);
    const phase = timeSec / AFTERGLOW_CYCLE_SEC + 1;
    const i = Math.floor(phase) % AFTERGLOW.length;
    const f = phase - Math.floor(phase);
    const ease = f * f * (3 - 2 * f);
    nebulaMat.uniforms.uBodyColor.value.lerpColors(
      AFTERGLOW_A.setHex(AFTERGLOW[i]),
      AFTERGLOW_B.setHex(AFTERGLOW[(i + 1) % AFTERGLOW.length]),
      ease
    );
  }
}
