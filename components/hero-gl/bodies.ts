/**
 * @fileoverview Sun and moon meshes, texture load (≤1080px), wrap spin.
 * @module components/hero-gl/bodies
 */

import {
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
} from "three";
import {
  imageUrlNeedsCrossOrigin,
  optimizedImageUrl,
} from "@/utils/optimized-image-url";
import { HERO_SUN_DIAMETER_PX, HERO_TEXTURE_MAX_PX } from "./caps";
import {
  createSphereWrapMaterial,
  setSphereWrapPhase,
} from "./sphereWrapMaterial";

const SUN_GEO = new SphereGeometry(1, 48, 32);
const MOON_GEO = new SphereGeometry(1, 32, 24);

export type HeroBodyKind = "sun" | "synth" | "moon";

export interface HeroBodyDef {
  key: string;
  slug: string;
  name: string;
  kind: HeroBodyKind;
  diameter: number;
  image?: string;
  spinDur: number;
  spinRev: boolean;
}

export interface HeroBodyHandle {
  key: string;
  slug: string;
  kind: HeroBodyKind;
  mesh: Mesh;
  diameter: number;
  spinDur: number;
  spinRev: boolean;
  wrap: ReturnType<typeof createSphereWrapMaterial> | null;
  texture: Texture | null;
}

function tintMaterial(hex = 0x6c6388): MeshLambertMaterial {
  return new MeshLambertMaterial({
    color: new Color(hex),
    emissive: new Color(0x1c1730),
    emissiveIntensity: 0.4,
  });
}

function prelitMaterial(map?: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: map ?? null,
    color: map ? 0xffffff : 0xffd7a0,
  });
}

/**
 * @brief Artwork URL capped at 1080. Flagship planets use the webp posters.
 * @param def Body definition.
 */
export function heroBodyTextureUrl(def: HeroBodyDef): string {
  if (def.kind === "sun") return "";
  if (def.kind === "synth") return "";
  const raw = (def.image || "").trim();
  if (!raw) return "";
  return optimizedImageUrl(raw, HERO_TEXTURE_MAX_PX);
}

/**
 * @brief Builds a unit sphere scaled to the world diameter.
 */
export function createBodyMesh(def: HeroBodyDef): HeroBodyHandle {
  const geo = def.kind === "sun" ? SUN_GEO : MOON_GEO;
  const prelit = def.kind === "sun" || def.kind === "synth";
  const mesh = new Mesh(geo, prelit ? prelitMaterial() : tintMaterial());
  mesh.scale.setScalar(Math.max(4, def.diameter / 2));
  mesh.name = def.key;
  mesh.userData = { key: def.key, slug: def.slug, kind: def.kind };
  return {
    key: def.key,
    slug: def.slug,
    kind: def.kind,
    mesh,
    diameter: def.diameter,
    spinDur: def.spinDur,
    spinRev: def.spinRev,
    wrap: null,
    texture: null,
  };
}

export function createSunMesh(): HeroBodyHandle {
  return createBodyMesh({
    key: "sun-cymasphere",
    slug: "cymasphere",
    name: "Cymasphere",
    kind: "sun",
    diameter: HERO_SUN_DIAMETER_PX,
    spinDur: 80,
    spinRev: false,
  });
}

/**
 * @brief Loads a texture without forcing CORS on same-origin optimizer URLs.
 */
export function loadHeroTexture(url: string): Promise<Texture | null> {
  if (!url || typeof Image === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (imageUrlNeedsCrossOrigin(url)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      const tex = new Texture(img);
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * @brief World-space sphere radius. Featured moons grow like the old
 * CSS `0.96 + focusW * 0.5` boost so holds match the billboard disk.
 * @param diameter Kepler seat diameter in px.
 * @param focusW Eased 0–1 close-up weight.
 */
export function heroBodyRadius(diameter: number, focusW = 0): number {
  const visual = diameter * (0.96 + Math.min(1, Math.max(0, focusW)) * 0.5);
  return Math.max(4, visual / 2);
}

/**
 * @brief Sun radius after the CSS `sunScaleFromCamera` cheat.
 * @param sunScale Multiplier from the tour pose (≈0.42 far, ≈1.55 close).
 */
export function heroSunRadius(sunScale: number): number {
  return Math.max(4, (HERO_SUN_DIAMETER_PX / 2) * Math.max(0.14, sunScale));
}

/**
 * @brief Applies a loaded map. Sun, synth, and catalog moons all use
 * the wrap shader — the posters are square art, not equirectangular.
 */
export function applyBodyTexture(
  handle: HeroBodyHandle,
  texture: Texture
): void {
  handle.texture?.dispose();
  handle.texture = texture;
  handle.wrap?.dispose();
  const wrap = createSphereWrapMaterial(texture, handle.kind === "moon");
  handle.wrap = wrap;
  handle.mesh.rotation.set(0, 0, 0);
  const prev = handle.mesh.material;
  handle.mesh.material = wrap;
  if (prev && prev !== wrap && !Array.isArray(prev)) prev.dispose();
}

/**
 * @brief Advances wrap phase (shader) or Y spin before art loads.
 */
export function poseBodySpin(handle: HeroBodyHandle, phase: number): void {
  if (handle.wrap) {
    setSphereWrapPhase(handle.wrap, phase);
    return;
  }
  handle.mesh.rotation.y = phase * Math.PI * 2;
}

/**
 * @brief Drops GPU resources for one body (geometry is shared — not disposed).
 */
export function disposeBodyHandle(handle: HeroBodyHandle): void {
  handle.wrap?.dispose();
  handle.texture?.dispose();
  const mat = handle.mesh.material;
  if (mat && !Array.isArray(mat)) mat.dispose();
}
