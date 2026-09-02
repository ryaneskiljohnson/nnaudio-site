/**
 * @fileoverview Hero far-plane starfield with faint dust among the stars.
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

float wrapLon(float lon) {
  return lon - 6.28318530718 * floor((lon + 3.14159265) / 6.28318530718);
}
`;

const STARS_FRAG = /* glsl */ `
${GLSL_COMMON}

uniform float uStars;
uniform float uStarCount;
uniform float uCellDensity;
uniform float uSpin;
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
    p = p * 2.11 + vec2(9.2, 3.4);
    amp *= 0.5;
  }
  return sum;
}

vec3 starLayer(vec2 eq, float offSun) {
  vec2 starUv = eq * uTiling;
  float cells = unityVoronoi(starUv, uStars, uCellDensity);
  vec2 cellId = floor(starUv * uCellDensity);
  float pick = fract(sin(dot(cellId, vec2(127.1, 311.7))) * 43758.5453);
  float colorT = fract(sin(dot(cellId, vec2(269.5, 183.3))) * 43758.5453);
  float sizePick = fract(sin(dot(cellId, vec2(73.1, 19.4))) * 43758.5453);
  float radius = mix(0.062, 0.09, smoothstep(0.78, 1.0, sizePick));
  float star = exp(-pow(cells / radius, 2.0) * 3.2);
  star *= step(0.980, pick);
  vec2 dustUv = vec2(eq.x, asin(clamp(eq.y, -1.0, 1.0)));
  float n1 = fbm(dustUv * vec2(1.05, 1.4));
  float n2 = fbm(dustUv * vec2(1.55, 2.05) + vec2(2.1, -0.7));
  float wisps = smoothstep(0.54, 0.76, n1) * smoothstep(0.44, 0.68, n2);
  float frame = mix(0.35, 1.0, smoothstep(0.12, 0.75, length(vNdc)));
  vec3 dust = vec3(0.55, 0.62, 0.95) * wisps * offSun * frame * 0.08;
  return sampleStarColors(colorT) * star + dust;
}

void main() {
  vec3 dir = skyDir();
  vec3 camWorld = (uViewToLocal * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float camDist = max(length(camWorld), 1e-3);
  float towardSun = saturate(dot(dir, -camWorld / camDist));
  float offSun = 1.0 - smoothstep(0.88, 0.998, towardSun);
  vec2 eq = skyEquirect(dir);
  eq.x = wrapLon(eq.x + uSpin * 6.28318530718);
  vec3 rgb = starLayer(eq, offSun);
  float seam = smoothstep(2.55, 3.14159265, abs(eq.x));
  if (seam > 0.0) {
    vec2 eqWrap = vec2(eq.x - sign(eq.x) * 6.28318530718, eq.y);
    rgb = mix(rgb, starLayer(eqWrap, offSun), seam * 0.5);
  }
  gl_FragColor = vec4(rgb, 1.0);
  #include <colorspace_fragment>
}
`;

const INV_PROJ = new Matrix4();
const INV_WORLD = new Matrix4();
const VIEW_TO_LOCAL = new Matrix4();
const TAU = Math.PI * 2;

/**
 * @brief Wraps a longitude into (−π, π] after wrap-phase yaw.
 * @param lon Radians, any finite value.
 * @returns Equivalent angle in (−π, π].
 * @note Matches GLSL `wrapLon` so seam tests stay on the atan cut.
 * @example
 * wrapSkyLongitude(Math.PI + 0.5) // ≈ -Math.PI + 0.5
 */
export function wrapSkyLongitude(lon: number): number {
  return lon - TAU * Math.floor((lon + Math.PI) / TAU);
}

/**
 * @brief Full-screen far-plane mesh that is never frustum-culled.
 * @param name Object name for later lookup.
 * @param material Starfield shader.
 * @param renderOrder Draw before Kepler bodies.
 * @returns Mesh parented by {@link createHeroSkybox}.
 */
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
 * @brief Far-plane stars with faint random dust among them.
 * @returns Sky group parented to the scene, not the Kepler world.
 * @note Dust lives in the star shader so it is not a second nebula
 * layer. Wisps are mid-scale and kept quiet so they read as haze
 * among the stars, not a wash. They still fade on the sun.
 * Stars are posed in Kepler space and yaw with Cymasphere's wrap
 * phase so the sky turns as if the camera were orbiting the sun.
 * The atan wrap is crossfaded. The quad sits at the far plane so
 * planets stay in front.
 * @example
 * scene.add(createHeroSkybox());
 */
export function createHeroSkybox(): Group {
  const stars = farLayer(
    "hero-stars",
    new ShaderMaterial({
      name: "hero-stars",
      uniforms: {
        uStars: { value: 150 },
        uStarCount: { value: 135 },
        uCellDensity: { value: 22 },
        uSpin: { value: 0 },
        uTiling: { value: new Vector2(6, 3) },
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
  group.add(stars);
  return group;
}

/**
 * @brief Advances the far-plane starfield in Kepler space.
 * @param root {@link createHeroSkybox} result.
 * @param camera Active tour camera.
 * @param world Kepler world group that receives the tour matrix.
 * @param spinPhase Cymasphere wrap phase in [0, 1). Same value
 * passed to the sun wrap.
 * @returns Nothing.
 * @note View rays go through the world matrix, then yaw with the
 * wrap so the sky moves as the camera would around Cymasphere.
 */
export function poseHeroSkybox(
  root: Object3D,
  camera: Camera,
  world: Object3D,
  spinPhase = 0
): void {
  const stars = root.getObjectByName("hero-stars") as Mesh | undefined;
  if (!stars) return;
  camera.updateMatrixWorld(true);
  world.updateMatrixWorld(true);
  INV_PROJ.copy(camera.projectionMatrix).invert();
  INV_WORLD.copy(world.matrixWorld).invert();
  VIEW_TO_LOCAL.multiplyMatrices(INV_WORLD, camera.matrixWorld);
  const starMat = stars.material as ShaderMaterial;
  starMat.uniforms.uInvProj.value.copy(INV_PROJ);
  starMat.uniforms.uViewToLocal.value.copy(VIEW_TO_LOCAL);
  starMat.uniforms.uSpin.value = spinPhase;
}
