/**
 * @fileoverview Stars, nebulae, Kepler orbit lines, and CymaSynth rings.
 * @module components/hero-gl/environment
 */

import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import {
  CYMASYNTH_OSC_GREEN,
  CYMASYNTH_OSC_RING_SETS,
  CYMASYNTH_RING_PLATE_MOON_PX,
  SYNTH_RING_TUBE_RADIUS,
  synthOscDiskEulerRad,
  synthOscPlateSpinDeg,
  synthOscRingSpinRad,
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

function fadeRgba(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)$/, `${alpha})`);
}

function radialSprite(
  color: string,
  size = 128,
  midAlpha = 0.28,
  halo = false
): CanvasTexture {
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
  if (halo) {
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.8, "rgba(0,0,0,0)");
    g.addColorStop(0.875, color);
    g.addColorStop(0.94, fadeRgba(color, midAlpha));
    g.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    g.addColorStop(0, color);
    g.addColorStop(0.45, fadeRgba(color, midAlpha));
    g.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * @brief Screen-facing star field (parented to the camera, not the world).
 */
export function createStarField(): Points {
  const count = 120;
  const rand = mulberry32(0x5eed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const halfW = 1800;
  const halfH = 1100;
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
    size: 2.1,
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
 * @brief Soft additive clouds behind Cymasphere. Parent to the sun mesh
 * so they stay on the far side of the disk as the camera tours.
 * Local units: sun radius = 1, −Z is away from the camera after billboard.
 */
export function createNebulae(): Group {
  const group = new Group();
  group.name = "hero-nebulae";
  group.frustumCulled = false;
  const specs = [
    { color: "rgba(108,99,255,0.10)", x: -1.6, y: 0.8, z: -2.4, sx: 7.2, sy: 5.0, mid: 0.05 },
    { color: "rgba(150,90,255,0.05)", x: -0.5, y: 0.2, z: -2.1, sx: 4.6, sy: 3.8, mid: 0.03 },
    { color: "rgba(140,100,255,0.05)", x: 1.8, y: -0.4, z: -2.3, sx: 6.4, sy: 4.4, mid: 0.02 },
    { color: "rgba(90,70,200,0.03)", x: 2.2, y: -0.9, z: -2.0, sx: 4.0, sy: 3.2, mid: 0.015 },
    { color: "rgba(78,205,196,0.04)", x: 0.2, y: 0.3, z: -2.2, sx: 5.4, sy: 3.6, mid: 0.02 },
    { color: "rgba(60,180,190,0.02)", x: -1.2, y: -0.6, z: -1.9, sx: 3.6, sy: 2.8, mid: 0.012 },
  ];
  for (const spec of specs) {
    const mat = new SpriteMaterial({
      map: radialSprite(spec.color, 160, spec.mid),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    const sprite = new Sprite(mat);
    sprite.frustumCulled = false;
    sprite.position.set(spec.x, spec.y, spec.z);
    sprite.scale.set(spec.sx, spec.sy, 1);
    sprite.renderOrder = -2;
    group.add(sprite);
  }
  return group;
}

function addSunSprite(
  group: Group,
  color: string,
  midAlpha: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  name: string,
  halo = false
): void {
  const mat = new SpriteMaterial({
    map: radialSprite(color, 160, midAlpha, halo),
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(sx, sy, 1);
  sprite.name = name;
  sprite.renderOrder = -1;
  group.add(sprite);
}

/**
 * @brief Edge-only corona. Halo sprites stay behind the disk so the
 * face stays clear; depth test keeps nearer planets in front.
 */
export function createSunAura(): Group {
  const group = new Group();
  group.name = "hero-sun-glow";
  addSunSprite(
    group,
    "rgba(176,150,255,0.22)",
    0.08,
    0,
    0,
    -0.14,
    2.18,
    2.18,
    "sun-corona",
    true
  );
  addSunSprite(
    group,
    "rgba(108,99,255,0.20)",
    0.07,
    0,
    0,
    -0.18,
    2.32,
    2.32,
    "sun-bloom-violet",
    true
  );
  return group;
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
  const alpha = Math.max(0.16, 0.38 - index * 0.035);
  const mat = new LineBasicMaterial({
    color: new Color(0xffe2c8),
    transparent: true,
    opacity: alpha,
    depthWrite: false,
  });
  const line = new LineLoop(geo, mat);
  line.name = `orbit-${system.keys[index]}`;
  line.userData.baseOpacity = alpha;
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
 * @brief CymaSynth oscillator nest: eight slightly splayed disks, each
 * with one sine loop that spins around that disk's normal.
 */
export function createSynthOscRings(): Group {
  const group = new Group();
  group.name = "hero-synth-rings";
  const color = new Color(CYMASYNTH_OSC_GREEN);
  const steps = 128;
  for (const set of CYMASYNTH_OSC_RING_SETS) {
    const plate = new Group();
    plate.name = "hero-synth-ring-set";
    plate.rotation.order = "XYZ";
    plate.rotation.x = (set.tiltX * Math.PI) / 180;
    plate.rotation.z = (set.tiltZ * Math.PI) / 180;
    for (const ring of set.rings) {
      const pts: Vector3[] = [];
      for (let i = 0; i < steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        const r = ring.radius + ring.amplitude * Math.sin(ring.cycles * t);
        pts.push(new Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
      }
      const curve = new CatmullRomCurve3(pts, true, "catmullrom", 0);
      const geo = new TubeGeometry(
        curve,
        steps,
        SYNTH_RING_TUBE_RADIUS,
        6,
        true
      );
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new Mesh(geo, mat);
      mesh.userData.baseOpacity = 0.92;
      mesh.userData.periodSec = ring.periodSec;
      plate.add(mesh);
    }
    group.add(plate);
  }
  return group;
}

/**
 * @brief World-space Saturn pose. The plate is a sibling of the moon
 * (not billboarded) so rings stay in their plane while the sphere
 * faces the camera. Scale matches the posed moon diameter.
 * @param group Synth ring group.
 * @param elapsedMs Tour time; plate precesses and each loop spins.
 * @param opacity 0–1 fade. Hidden when alpha is ~0.
 * @param visualDiameter Posed moon diameter in world px.
 */
export function poseSynthOscRings(
  group: Group,
  elapsedMs: number,
  opacity: number,
  visualDiameter = CYMASYNTH_RING_PLATE_MOON_PX
): void {
  group.scale.setScalar(
    Math.max(8, visualDiameter) / CYMASYNTH_RING_PLATE_MOON_PX
  );
  const euler = synthOscDiskEulerRad(synthOscPlateSpinDeg(elapsedMs));
  group.rotation.order = "XYZ";
  group.rotation.set(euler.x, euler.y, euler.z);
  for (const plate of group.children) {
    for (const child of plate.children) {
      const period = Number(child.userData.periodSec);
      child.rotation.z = synthOscRingSpinRad(elapsedMs, period);
    }
  }
  fadeLineGroup(group, opacity, 0.92);
}

/**
 * @brief Fades Kepler orbit lines without rebuilding them.
 * @param group Orbit-ring group.
 * @param opacity 0–1.
 */
export function poseOrbitRingsOpacity(group: Group, opacity: number): void {
  fadeLineGroup(group, opacity, 0.28);
}

function fadeLineGroup(
  group: Group,
  opacity: number,
  defaultBase: number
): void {
  const f = Math.min(1, Math.max(0, opacity));
  group.visible = f > 0.02;
  group.traverse((obj) => {
    const line = obj as {
      material?: { opacity?: number; transparent?: boolean };
      userData?: { baseOpacity?: number };
    };
    const mat = line.material;
    if (!mat || typeof mat.opacity !== "number") return;
    const base = line.userData?.baseOpacity ?? defaultBase;
    mat.transparent = true;
    mat.opacity = base * f;
  });
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
