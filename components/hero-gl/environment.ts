/**
 * @fileoverview Stars, nebulae, Kepler orbit lines, and CymaSynth rings.
 * @module components/hero-gl/environment
 */

import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from "three";
import {
  CYMASYNTH_OSC_GREEN,
  CYMASYNTH_OSC_RINGS,
  CYMASYNTH_RING_PLATE_MOON_PX,
  synthOscDiskEulerRad,
  type MoonWorldPos,
} from "@/utils/circuit-network-layout";
import {
  orbitRingBasisCss,
  type OrbitalSystem,
} from "@/utils/orbital-physics";
import { keplerToThree } from "./tourCameraRig";

function mulberry32(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radialSprite(color: string, size = 128): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, color);
  g.addColorStop(0.45, color.replace(/[\d.]+\)$/, "0.28)"));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * @brief Screen-facing star field (parented to the camera, not the world).
 * @param compact Phone: fewer stars.
 */
export function createStarField(compact: boolean): Points {
  const count = compact ? 20 : 120;
  const rand = mulberry32(0x5eed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const halfW = compact ? 900 : 1800;
  const halfH = compact ? 700 : 1100;
  for (let i = 0; i < count; i += 1) {
    pos[i * 3] = (rand() * 2 - 1) * halfW;
    pos[i * 3 + 1] = (rand() * 2 - 1) * halfH;
    pos[i * 3 + 2] = 0;
    const a = 0.35 + rand() * 0.65;
    col[i * 3] = a;
    col[i * 3 + 1] = a;
    col[i * 3 + 2] = a;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  const mat = new PointsMaterial({
    size: compact ? 1.6 : 2.1,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.name = "hero-stars";
  return points;
}

/**
 * @brief Soft additive nebula sprites (desktop only).
 */
export function createNebulae(): Group {
  const group = new Group();
  group.name = "hero-nebulae";
  const specs = [
    { color: "rgba(108,99,255,0.55)", x: -220, y: 80, s: 900 },
    { color: "rgba(255,190,130,0.4)", x: 260, y: -40, s: 760 },
    { color: "rgba(60,180,190,0.28)", x: 40, y: 20, s: 640 },
  ];
  for (const spec of specs) {
    const mat = new SpriteMaterial({
      map: radialSprite(spec.color),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new Sprite(mat);
    sprite.position.set(spec.x, spec.y, 0);
    sprite.scale.set(spec.s, spec.s * 0.78, 1);
    group.add(sprite);
  }
  return group;
}

/**
 * @brief Sun corona sprite sitting at the origin (child of world).
 */
export function createSunGlow(): Sprite {
  const mat = new SpriteMaterial({
    map: radialSprite("rgba(255,214,160,0.9)", 160),
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(980, 820, 1);
  sprite.position.set(0, 0, 0);
  sprite.name = "hero-sun-glow";
  return sprite;
}

/**
 * @brief One Kepler orbit as a faint line in the body's plane.
 * @param system Packed orbits.
 * @param index Body index used for the plane basis.
 */
export function createOrbitRing(system: OrbitalSystem, index: number): LineLoop {
  const a = system.a[index];
  const { ex, ey } = orbitRingBasisCss(
    system.sinNode[index],
    system.cosNode[index],
    system.sinI[index],
    system.cosI[index]
  );
  const steps = 128;
  const pos = new Float32Array((steps + 1) * 3);
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const cx = Math.cos(t) * a;
    const cy = Math.sin(t) * a;
    const cssX = ex[0] * cx + ey[0] * cy;
    const cssY = ex[1] * cx + ey[1] * cy;
    const cssZ = ex[2] * cx + ey[2] * cy;
    const p = keplerToThree(cssX, -cssY, cssZ);
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const alpha = Math.max(0.16, 0.38 - index * 0.012);
  const mat = new LineBasicMaterial({
    color: new Color(0xb8a8ff),
    transparent: true,
    opacity: alpha,
    depthWrite: false,
  });
  const line = new LineLoop(geo, mat);
  line.name = `orbit-${system.keys[index]}`;
  line.frustumCulled = false;
  return line;
}

/**
 * @brief Unique-radius orbit lines for the system (desktop).
 */
export function createOrbitRings(system: OrbitalSystem): Group {
  const group = new Group();
  group.name = "hero-orbits";
  const seen = new Set<number>();
  for (let i = 0; i < system.count; i += 1) {
    const key = Math.round(system.a[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    group.add(createOrbitRing(system, i));
  }
  return group;
}

/**
 * @brief CymaSynth oscillator family as line loops around the moon.
 */
export function createSynthOscRings(): Group {
  const group = new Group();
  group.name = "hero-synth-rings";
  const color = new Color(CYMASYNTH_OSC_GREEN);
  for (const ring of CYMASYNTH_OSC_RINGS) {
    const steps = 96;
    const pos = new Float32Array((steps + 1) * 3);
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * Math.PI * 2;
      const r = ring.radius + ring.amplitude * Math.sin(ring.cycles * t);
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = Math.sin(t) * r;
      pos[i * 3 + 2] = 0;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const mat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const line = new Line(geo, mat);
    // Shared 52° disk tilt lives on the group so Z spin stays in-plane.
    line.rotation.x = (ring.tiltX * Math.PI) / 180;
    line.rotation.z = (ring.tiltZ * Math.PI) / 180;
    group.add(line);
  }
  return group;
}

/**
 * @brief Seats the oscillator nest on the live CymaSynth moon.
 * @param group Synth ring group.
 * @param world Live Kepler seat.
 * @param diameter Moon diameter in world px.
 * @param spinDeg In-plane turn around the disk normal (degrees).
 * @param visible When false the nest is hidden (sun approach).
 */
export function poseSynthOscRings(
  group: Group,
  world: MoonWorldPos,
  diameter: number,
  spinDeg: number,
  visible: boolean
): void {
  const p = keplerToThree(world.x, world.height, world.z);
  group.position.set(p.x, p.y, p.z);
  const scale = diameter / CYMASYNTH_RING_PLATE_MOON_PX;
  group.scale.setScalar(Math.max(0.01, scale));
  const euler = synthOscDiskEulerRad(spinDeg);
  group.rotation.order = "XYZ";
  group.rotation.set(euler.x, euler.y, euler.z);
  group.visible = visible;
}

/**
 * @brief Releases GPU resources for an environment group.
 */
export function disposeObject3D(root: { traverse: (fn: (o: unknown) => void) => void }): void {
  root.traverse((obj) => {
    const o = obj as {
      geometry?: { dispose: () => void };
      material?:
        | { dispose: () => void; map?: { dispose: () => void } }
        | Array<{ dispose: () => void; map?: { dispose: () => void } }>;
    };
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const mat of mats) {
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
