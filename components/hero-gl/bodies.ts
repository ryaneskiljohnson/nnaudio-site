/**
 * @fileoverview Sun and moon meshes, texture load (≤1080px), wrap spin.
 * @module components/hero-gl/bodies
 */

import {
  ClampToEdgeWrapping,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
} from "three";
import {
  imageUrlNeedsCrossOrigin,
  optimizedImageUrl,
} from "@/utils/optimized-image-url";
import { HERO_SUN_DIAMETER_PX, HERO_TEXTURE_MAX_PX } from "./caps";
import { createSunAura, disposeObject3D } from "./environment";
import {
  createSphereWrapMaterial,
  setSphereWrapOpacity,
  setSphereWrapPhase,
} from "./sphereWrapMaterial";

const BODY_GEO = new SphereGeometry(1, 48, 32);
const BODY_AURA_NAME = "hero-sun-glow";

/**
 * @brief Stops wrap-seams: no mips (fract U would pick a muddy
 * average) and clamp so the join does not sample across the square.
 */
export function configureHeroWrapTexture(texture: Texture): void {
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
}

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
  /** Last wrap URL so a slot can swap catalog art. */
  artUrl: string | null;
}

function tintMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color(0x7a7688),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
}

function bodyAura(mesh: Mesh): ReturnType<Mesh["getObjectByName"]> {
  return mesh.getObjectByName(BODY_AURA_NAME);
}

function applyBodyAuraOpacity(mesh: Mesh, opacity: number): void {
  const aura = bodyAura(mesh);
  if (!aura) return;
  aura.visible = opacity > 0.02;
  aura.traverse((obj) => {
    const mat = (obj as { material?: { opacity?: number } }).material;
    if (mat && typeof mat.opacity === "number") mat.opacity = opacity;
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
  const mesh = new Mesh(BODY_GEO, tintMaterial());
  mesh.scale.setScalar(Math.max(4, def.diameter / 2));
  mesh.visible = false;
  if (typeof document !== "undefined") {
    mesh.add(createSunAura());
    applyBodyAuraOpacity(mesh, def.kind === "sun" ? 1 : 0);
  }
  if (mesh.material && !Array.isArray(mesh.material)) {
    const solid = def.kind === "sun";
    mesh.material.opacity = solid ? 1 : 0;
    mesh.material.transparent = !solid;
    mesh.material.depthWrite = solid;
  }
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
    artUrl: null,
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
 * @brief World-space sun radius. Same formula as an unfeatured planet.
 * @param diameterPx World disk from {@link heroSunFitDiameterPx}.
 */
export function heroSunRadius(diameterPx = HERO_SUN_DIAMETER_PX): number {
  return Math.max(4, diameterPx / 2);
}

/**
 * @brief Applies a loaded map. CymaSynth gets overlapping polar
 * stickers on the ring-plate axis; every other body wraps front
 * and back.
 */
export function applyBodyTexture(
  handle: HeroBodyHandle,
  texture: Texture
): void {
  const prevOpacity = bodyOpacity(handle);
  handle.texture?.dispose();
  configureHeroWrapTexture(texture);
  handle.texture = texture;
  handle.wrap?.dispose();
  const wrap = createSphereWrapMaterial(texture, {
    capMap: handle.kind === "synth",
  });
  handle.wrap = wrap;
  handle.mesh.rotation.set(0, 0, 0);
  const prev = handle.mesh.material;
  handle.mesh.material = wrap;
  if (prev && prev !== wrap && !Array.isArray(prev)) prev.dispose();
  applyBodyOpacity(handle, prevOpacity);
}

/**
 * @brief Current fade of a body (wrap uniform or basic material).
 * @param handle Body handle.
 */
export function bodyOpacity(handle: HeroBodyHandle): number {
  if (handle.wrap) {
    const value = handle.wrap.uniforms.uOpacity?.value;
    return typeof value === "number" ? value : 1;
  }
  const mat = handle.mesh.material;
  if (mat && !Array.isArray(mat) && "opacity" in mat) {
    return typeof mat.opacity === "number" ? mat.opacity : 1;
  }
  return handle.mesh.visible ? 1 : 0;
}

/**
 * @brief Fades a moon without unmounting it. Hidden only when alpha is ~0.
 * @param handle Body handle.
 * @param opacity 0–1.
 */
export function applyBodyOpacity(handle: HeroBodyHandle, opacity: number): void {
  const o = Math.min(1, Math.max(0, opacity));
  handle.mesh.visible = o > 0.02;
  applyBodyAuraOpacity(handle.mesh, o);
  if (handle.wrap) {
    setSphereWrapOpacity(handle.wrap, o);
    return;
  }
  const mat = handle.mesh.material;
  if (mat && !Array.isArray(mat) && "opacity" in mat) {
    const solid = o >= 0.99;
    mat.transparent = !solid;
    mat.opacity = o;
    mat.depthWrite = solid;
  }
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
  const aura = bodyAura(handle.mesh);
  if (aura) {
    aura.removeFromParent();
    disposeObject3D(aura);
  }
  handle.wrap?.dispose();
  handle.texture?.dispose();
  const mat = handle.mesh.material;
  if (mat && !Array.isArray(mat)) mat.dispose();
}
