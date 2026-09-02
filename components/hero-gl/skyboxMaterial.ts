/**
 * @fileoverview Hero far-plane sky: stars plus a faint aurora haze
 * behind the solar system.
 * @module components/hero-gl/skyboxMaterial
 */

import {
  AdditiveBlending,
  Group,
  Matrix4,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type Camera,
  type Object3D,
} from "three";

/**
 * Additive gain for the far-sky aurora. Visible as a wash, not a band.
 * @note The shader fades a cone toward the sun so haze stays among the
 * stars and does not punch through the transparent Cymasphere disk.
 */
export const HERO_AURORA_INTENSITY = 0.2;

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

const AURORA_FRAG = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uIntensity;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise2(p);
    p = p * 2.05 + vec2(13.1, 4.7);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec3 dir = skyDir();
  vec2 eq = skyEquirect(dir);
  float drift = uTime * 0.007;
  vec2 field = vec2(eq.x * 0.2, eq.y * 0.24) + vec2(drift * 0.09, -drift * 0.04);
  float n1 = fbm(field);
  float n2 = fbm(field * 0.68 + vec2(3.8, -1.6));
  float wash = mix(0.4, 1.0, saturate(n1 * 0.68 + n2 * 0.32));
  vec3 camWorld = (uViewToLocal * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toSun = normalize(-camWorld);
  float sunCone = 1.0 - smoothstep(0.9, 0.998, saturate(dot(dir, toSun)));
  float haze = wash * sunCone;
  vec3 blue = vec3(0.22, 0.38, 0.9);
  vec3 violet = vec3(0.46, 0.3, 0.84);
  vec3 teal = vec3(0.14, 0.52, 0.66);
  vec3 tint = mix(blue, violet, saturate(n2));
  tint = mix(tint, teal, saturate(n1) * 0.26);
  gl_FragColor = vec4(tint * haze * uIntensity, 1.0);
  #include <colorspace_fragment>
}
`;

const INV_PROJ = new Matrix4();
const INV_WORLD = new Matrix4();
const VIEW_TO_LOCAL = new Matrix4();

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
 * @brief Far-plane stars with a faint aurora wash among them.
 * @returns Sky group parented to the scene, not the Kepler world.
 * @note Both layers sit at the far plane so planets stay in front.
 * @example
 * scene.add(createHeroSkybox());
 */
export function createHeroSkybox(): Group {
  const aurora = farLayer(
    "hero-aurora",
    new ShaderMaterial({
      name: "hero-aurora",
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: HERO_AURORA_INTENSITY },
        uInvProj: { value: new Matrix4() },
        uViewToLocal: { value: new Matrix4() },
      },
      vertexShader: VERT,
      fragmentShader: AURORA_FRAG,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
    -19
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
  group.add(aurora);
  group.add(stars);
  return group;
}

/**
 * @brief Advances star twinkle and aurora drift in world space.
 * @param root {@link createHeroSkybox} result.
 * @param camera Active tour camera.
 * @param world Kepler world group that receives the tour matrix.
 * @param timeSec Elapsed seconds.
 * @returns Nothing.
 */
export function poseHeroSkybox(
  root: Object3D,
  camera: Camera,
  world: Object3D,
  timeSec: number
): void {
  const stars = root.getObjectByName("hero-stars") as Mesh | undefined;
  const aurora = root.getObjectByName("hero-aurora") as Mesh | undefined;
  if (!stars || !aurora) return;
  camera.updateMatrixWorld(true);
  world.updateMatrixWorld(true);
  INV_PROJ.copy(camera.projectionMatrix).invert();
  INV_WORLD.copy(world.matrixWorld).invert();
  VIEW_TO_LOCAL.multiplyMatrices(INV_WORLD, camera.matrixWorld);
  const starMat = stars.material as ShaderMaterial;
  starMat.uniforms.uTime.value = timeSec;
  starMat.uniforms.uInvProj.value.copy(INV_PROJ);
  starMat.uniforms.uViewToLocal.value.copy(VIEW_TO_LOCAL);
  const auroraMat = aurora.material as ShaderMaterial;
  auroraMat.uniforms.uTime.value = timeSec;
  auroraMat.uniforms.uInvProj.value.copy(INV_PROJ);
  auroraMat.uniforms.uViewToLocal.value.copy(VIEW_TO_LOCAL);
}
