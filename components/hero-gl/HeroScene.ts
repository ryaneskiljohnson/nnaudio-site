/**
 * @fileoverview Three.js game loop for the homepage solar system.
 * One WebGLRenderer, 1080p buffer, Kepler bodies in a world group
 * posed by TourCamera.
 * @module components/hero-gl/HeroScene
 */

import {
  AmbientLight,
  DirectionalLight,
  Group,
  MeshBasicMaterial,
  PerspectiveCamera,
  NoToneMapping,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  skyParallaxCss,
  SUN_FOCUS_KEY,
  type MoonWorldPos,
  type TourCamera,
} from "@/utils/circuit-network-layout";
import type { OrbitalSystem } from "@/utils/orbital-physics";
import {
  CYMASPHERE_SUN_POSTER,
  CYMASYNTH_SPHERE_POSTER,
  heroDrawingBufferSize,
} from "./caps";
import {
  applyBodyTexture,
  createBodyMesh,
  createSunMesh,
  disposeBodyHandle,
  heroBodyRadius,
  heroBodyTextureUrl,
  heroSunRadius,
  loadHeroTexture,
  poseBodySpin,
  type HeroBodyDef,
  type HeroBodyHandle,
} from "./bodies";
import {
  createNebulae,
  createOrbitRings,
  createStarField,
  createSunGlow,
  createSynthOscRings,
  disposeObject3D,
  poseSynthOscRings,
} from "./environment";
import {
  applyCssPerspectiveCamera,
  applyTourWorldMatrix,
  keplerToThree,
  lookPlusZToward,
} from "./tourCameraRig";

export interface HeroPick {
  key: string;
  slug: string;
}

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement;
  compact: boolean;
}

/**
 * @brief True when this browser can create a WebGL context.
 */
export function heroWebglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      probe.getContext("webgl2") || probe.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export class HeroScene {
  readonly renderer: WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly camera: PerspectiveCamera;
  readonly scene: Scene;
  readonly world: Group;
  readonly sky: Group;
  contextLost = false;

  private readonly compact: boolean;
  private readonly sun: HeroBodyHandle;
  private readonly bodies = new Map<string, HeroBodyHandle>();
  private readonly light: PointLight;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly sunGlow;
  private stars;
  private nebulae: Group | null = null;
  private orbits: Group | null = null;
  private synthRings: Group | null = null;
  private cssWidth = 1;
  private cssHeight = 1;
  private disposed = false;
  private readonly camWorld = new Vector3();
  private readonly glowBase = { x: 980, y: 820 };

  private constructor(canvas: HTMLCanvasElement, compact: boolean) {
    this.canvas = canvas;
    this.compact = compact;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x02030a, 1);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = NoToneMapping;
    this.camera = new PerspectiveCamera(50, 1, 2, 20000);
    this.scene = new Scene();
    this.world = new Group();
    this.world.name = "hero-world";
    this.sky = new Group();
    this.sky.name = "hero-sky";
    this.scene.add(this.world);
    this.camera.add(this.sky);
    this.scene.add(this.camera);

    this.scene.add(new AmbientLight(0x8a7ab8, 1.35));
    this.light = new PointLight(0xffe6c8, 2.8, 0, 1.05);
    this.light.position.set(0, 0, 0);
    this.world.add(this.light);
    // Headlight: sit on the camera and shine toward the planets (−Z).
    const key = new DirectionalLight(0xfff6ea, 3.2);
    key.position.set(0.15, 0.22, 0);
    key.target.position.set(0, 0, -1);
    this.camera.add(key);
    this.camera.add(key.target);

    this.sun = createSunMesh();
    this.world.add(this.sun.mesh);
    this.sunGlow = createSunGlow();
    this.world.add(this.sunGlow);

    this.stars = createStarField(compact);
    this.sky.add(this.stars);
    if (!compact) {
      this.nebulae = createNebulae();
      this.sky.add(this.nebulae);
    }

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener(
      "webglcontextrestored",
      this.onContextRestored,
      false
    );
  }

  /**
   * @brief Creates the engine, or null when WebGL is missing.
   */
  static tryCreate(options: HeroSceneOptions): HeroScene | null {
    if (!heroWebglAvailable()) return null;
    try {
      return new HeroScene(options.canvas, options.compact);
    } catch {
      return null;
    }
  }

  /**
   * @brief Resizes the drawing buffer (1080p cap) and CSS-matched FOV.
   */
  setViewSize(cssWidth: number, cssHeight: number): void {
    if (this.disposed) return;
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    const buf = heroDrawingBufferSize(this.cssWidth, this.cssHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(buf.width, buf.height, false);
    applyCssPerspectiveCamera(this.camera, this.cssWidth, this.cssHeight);
  }

  /**
   * @brief Rebuilds moon meshes when the catalog / Kepler seats change.
   */
  setBodies(defs: HeroBodyDef[]): void {
    const keep = new Set(defs.map((d) => d.key));
    for (const [key, handle] of this.bodies) {
      if (keep.has(key)) continue;
      this.world.remove(handle.mesh);
      disposeBodyHandle(handle);
      this.bodies.delete(key);
    }
    for (const def of defs) {
      const existing = this.bodies.get(def.key);
      if (existing) {
        existing.diameter = def.diameter;
        existing.slug = def.slug;
        existing.mesh.scale.setScalar(Math.max(4, def.diameter / 2));
        existing.mesh.userData.slug = def.slug;
        continue;
      }
      const handle = createBodyMesh(def);
      this.bodies.set(def.key, handle);
      this.world.add(handle.mesh);
    }
    this.syncSynthRings(defs);
  }

  /**
   * @brief Rebuilds faint Kepler rings (desktop). Pass null to remove.
   */
  setOrbitSystem(system: OrbitalSystem | null): void {
    if (this.orbits) {
      this.world.remove(this.orbits);
      disposeObject3D(this.orbits);
      this.orbits = null;
    }
    if (!system || this.compact) return;
    this.orbits = createOrbitRings(system);
    this.world.add(this.orbits);
  }

  /**
   * @brief Writes live Kepler seats onto meshes.
   */
  poseBodies(pos: Float32Array, keys: string[]): void {
    for (let i = 0; i < keys.length; i += 1) {
      const handle = this.bodies.get(keys[i]);
      if (!handle) continue;
      const p = keplerToThree(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      handle.mesh.position.set(p.x, p.y, p.z);
    }
  }

  poseBodySpinByKey(key: string, phase: number): void {
    const handle = key === SUN_FOCUS_KEY ? this.sun : this.bodies.get(key);
    if (handle) poseBodySpin(handle, phase);
  }

  poseSun(phase: number): void {
    poseBodySpin(this.sun, phase);
  }

  applyCamera(pose: TourCamera): void {
    applyTourWorldMatrix(this.world, pose);
    const sky = skyParallaxCss(pose.translateZ, pose.rotateX, pose.rotateY);
    this.sky.position.set(sky.x, -sky.y, -2400);
    this.sky.scale.setScalar(Math.max(0.7, sky.scale) * 2.2);
  }

  /**
   * @brief Applies the CSS sunScale cheat so far shots stay a star and
   * close-ups fill the frame like the old billboard disk.
   */
  poseSunScale(sunScale: number): void {
    const r = heroSunRadius(sunScale);
    this.sun.mesh.scale.setScalar(r);
    const baseR = heroSunRadius(1);
    this.sunGlow.scale.set(
      this.glowBase.x * (r / baseR),
      this.glowBase.y * (r / baseR),
      1
    );
  }

  /**
   * @brief Featured-hold size boost matching the old CSS disk scale.
   */
  poseBodyFocusScale(key: string, diameter: number, focusW: number): void {
    const handle = this.bodies.get(key);
    if (!handle) return;
    handle.mesh.scale.setScalar(heroBodyRadius(diameter, focusW));
  }

  setOrbitsVisible(visible: boolean): void {
    if (this.orbits) this.orbits.visible = visible;
  }

  /**
   * @brief Inverse-billboards every body so wrap art faces the camera.
   * Call after {@link applyCamera} so the world matrix is current.
   */
  billboardFacingCamera(): void {
    this.world.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.camera.getWorldPosition(this.camWorld);
    this.billboardHandle(this.sun);
    for (const handle of this.bodies.values()) {
      if (handle.mesh.visible) this.billboardHandle(handle);
    }
  }

  private billboardHandle(handle: HeroBodyHandle): void {
    handle.mesh.updateMatrixWorld(true);
    lookPlusZToward(handle.mesh, this.camWorld);
  }

  poseSynth(
    world: MoonWorldPos | null,
    diameter: number,
    spinDeg: number,
    visible: boolean
  ): void {
    if (!this.synthRings) return;
    if (!world) {
      this.synthRings.visible = false;
      return;
    }
    poseSynthOscRings(this.synthRings, world, diameter, spinDeg, visible);
  }

  setBodyVisible(key: string, visible: boolean): void {
    const handle = this.bodies.get(key);
    if (handle) handle.mesh.visible = visible;
  }

  /**
   * @brief Loads sun / synth posters and one catalog wrap. No 4K JPGs.
   */
  async loadBodyArt(def: HeroBodyDef): Promise<void> {
    if (this.disposed) return;
    const handle =
      def.kind === "sun" ? this.sun : this.bodies.get(def.key);
    if (!handle || handle.texture) return;
    const url =
      def.kind === "sun"
        ? CYMASPHERE_SUN_POSTER
        : def.kind === "synth"
          ? CYMASYNTH_SPHERE_POSTER
          : heroBodyTextureUrl(def);
    if (!url) return;
    const tex = await loadHeroTexture(url);
    if (!tex || this.disposed) {
      tex?.dispose();
      return;
    }
    applyBodyTexture(handle, tex);
  }

  evictArt(keep: ReadonlySet<string>): void {
    for (const [key, handle] of this.bodies) {
      if (keep.has(key)) continue;
      if (!handle.texture) continue;
      handle.texture.dispose();
      handle.texture = null;
      if (handle.wrap) {
        handle.wrap.dispose();
        handle.wrap = null;
        const prev = handle.mesh.material;
        handle.mesh.material = new MeshBasicMaterial({ color: 0x7a7688 });
        if (prev && !Array.isArray(prev)) prev.dispose();
      }
    }
  }

  /**
   * @brief Raycast from a pointer in the canvas CSS box.
   */
  pick(clientX: number, clientY: number, rect: DOMRectReadOnly): HeroPick | null {
    if (this.disposed || this.contextLost) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [this.sun.mesh, ...[...this.bodies.values()].map((b) => b.mesh)];
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits.find((h) => h.object.visible);
    if (!hit) return null;
    const data = hit.object.userData as { key?: string; slug?: string };
    if (!data.key || !data.slug) return null;
    return { key: data.key, slug: data.slug };
  }

  render(): void {
    if (this.disposed || this.contextLost) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.onContextRestored
    );
    disposeBodyHandle(this.sun);
    for (const handle of this.bodies.values()) {
      disposeBodyHandle(handle);
    }
    this.bodies.clear();
    if (this.orbits) disposeObject3D(this.orbits);
    if (this.nebulae) disposeObject3D(this.nebulae);
    if (this.synthRings) disposeObject3D(this.synthRings);
    disposeObject3D(this.stars);
    disposeObject3D(this.sunGlow);
    this.renderer.dispose();
  }

  private syncSynthRings(defs: HeroBodyDef[]): void {
    const hasSynth = defs.some((d) => d.kind === "synth");
    if (!hasSynth || this.compact) {
      if (this.synthRings) {
        this.world.remove(this.synthRings);
        disposeObject3D(this.synthRings);
        this.synthRings = null;
      }
      return;
    }
    if (this.synthRings) return;
    this.synthRings = createSynthOscRings();
    this.world.add(this.synthRings);
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
  };
}
