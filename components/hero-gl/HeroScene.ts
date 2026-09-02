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
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  NoToneMapping,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  SUN_FOCUS_KEY,
  synthOscDiskEulerRad,
  synthOscPlateSpinDeg,
  type TourCamera,
} from "@/utils/circuit-network-layout";
import type { OrbitalSystem } from "@/utils/orbital-physics";
import {
  CYMASPHERE_SUN_POSTER,
  CYMASYNTH_SPHERE_POSTER,
  heroDrawingBufferSize,
} from "./caps";
import {
  applyBodyOpacity,
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
  createOrbitRings,
  createSynthOscRings,
  disposeObject3D,
  poseOrbitRingsOpacity,
  poseSynthOscRings,
} from "./environment";
import { createHeroSkybox, poseHeroSkybox } from "./skyboxMaterial";
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
  contextLost = false;

  private readonly sun: HeroBodyHandle;
  private readonly bodies = new Map<string, HeroBodyHandle>();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly skybox: Group;
  private orbits: Group | null = null;
  private synthRings: Group | null = null;
  private cssWidth = 1;
  private cssHeight = 1;
  private disposed = false;
  private readonly camWorld = new Vector3();
  private synthElapsedMs = 0;

  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x02030a, 1);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.camera = new PerspectiveCamera(50, 1, 2, 20000);
    this.scene = new Scene();
    this.world = new Group();
    this.world.name = "hero-world";
    this.scene.add(this.world);
    this.scene.add(this.camera);
    this.skybox = createHeroSkybox();
    this.scene.add(this.skybox);

    this.scene.add(new AmbientLight(0x8a7ab8, 0.55));
    const key = new DirectionalLight(0xfff6ea, 0.35);
    key.position.set(-0.58, 0.42, 0.12);
    key.target.position.set(0.18, -0.16, -1);
    this.camera.add(key);
    this.camera.add(key.target);

    this.sun = createSunMesh();
    this.world.add(this.sun.mesh);

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
      return new HeroScene(options.canvas);
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
        existing.spinDur = def.spinDur;
        existing.spinRev = def.spinRev;
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
    if (!system) return;
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
    if (!handle) return;
    if (handle.kind === "synth") {
      if (handle.wrap) poseBodySpin(handle, 0);
      return;
    }
    poseBodySpin(handle, phase);
  }

  poseSun(phase: number): void {
    poseBodySpin(this.sun, phase);
  }

  applyCamera(pose: TourCamera): void {
    applyTourWorldMatrix(this.world, pose);
  }

  /**
   * @brief Sets Cymasphere's world diameter. Same units as a Kepler moon.
   * Call on board resize, not every frame — zoom is camera-only.
   */
  setSunDiameter(diameterPx: number): void {
    this.sun.diameter = diameterPx;
    this.sun.mesh.scale.setScalar(heroSunRadius(diameterPx));
  }

  /**
   * @brief Featured-hold size boost matching the old CSS disk scale.
   */
  poseBodyFocusScale(key: string, diameter: number, focusW: number): void {
    const handle = this.bodies.get(key);
    if (!handle) return;
    handle.mesh.scale.setScalar(heroBodyRadius(diameter, focusW));
  }

  /**
   * @brief Inverse-billboards catalog moons and Cymasphere. CymaSynth
   * shares the oscillator-plate tilt so the polar wrap spins on the
   * same axis as the rings.
   * Call after {@link applyCamera} so the world matrix is current.
   */
  billboardFacingCamera(): void {
    this.world.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.camera.getWorldPosition(this.camWorld);
    this.alignSynthSeat();
    this.billboardHandle(this.sun);
    for (const handle of this.bodies.values()) {
      if (handle.mesh.visible && handle.kind !== "synth") {
        this.billboardHandle(handle);
      }
    }
  }

  /**
   * @brief Matches CymaSynth's mesh to the oscillator plate: 52° Saturn
   * tilt plus the shared Z spin so the ±Z caps stay on the ring axis.
   */
  private alignSynthSeat(): void {
    const synth = this.findSynth();
    if (!synth || !synth.mesh.visible) return;
    this.orientSynthToRingPlate(synth);
  }

  /**
   * @brief Applies {@link synthOscDiskEulerRad} so wrap and rings share
   * one spin axis.
   * @param synth CymaSynth body handle.
   */
  private orientSynthToRingPlate(synth: HeroBodyHandle): void {
    const euler = synthOscDiskEulerRad(synthOscPlateSpinDeg(this.synthElapsedMs));
    synth.mesh.quaternion.identity();
    synth.mesh.rotation.order = "XYZ";
    synth.mesh.rotation.set(euler.x, euler.y, euler.z);
  }

  private billboardHandle(handle: HeroBodyHandle): void {
    handle.mesh.updateMatrixWorld(true);
    lookPlusZToward(handle.mesh, this.camWorld);
  }

  poseSynth(elapsedMs: number, opacity: number): void {
    if (!this.synthRings) return;
    const synth = this.findSynth();
    if (!synth || !synth.mesh.visible) {
      this.synthRings.visible = false;
      return;
    }
    if (this.synthRings.parent !== this.world) {
      this.synthRings.removeFromParent();
      this.world.add(this.synthRings);
    }
    this.synthElapsedMs = elapsedMs;
    this.synthRings.position.copy(synth.mesh.position);
    this.synthRings.quaternion.identity();
    this.orientSynthToRingPlate(synth);
    poseSynthOscRings(
      this.synthRings,
      elapsedMs,
      opacity,
      synth.mesh.scale.x * 2
    );
  }

  private findSynth(): HeroBodyHandle | undefined {
    for (const handle of this.bodies.values()) {
      if (handle.kind === "synth") return handle;
    }
    return undefined;
  }

  poseBodyOpacity(key: string, opacity: number): void {
    const handle = this.bodies.get(key);
    if (handle) applyBodyOpacity(handle, opacity);
  }

  poseOrbitsOpacity(opacity: number): void {
    if (this.orbits) poseOrbitRingsOpacity(this.orbits, opacity);
  }

  setBodyVisible(key: string, visible: boolean): void {
    this.poseBodyOpacity(key, visible ? 1 : 0);
  }

  setOrbitsVisible(visible: boolean): void {
    this.poseOrbitsOpacity(visible ? 1 : 0);
  }

  /**
   * @brief Loads sun / synth posters and one catalog wrap. No 4K JPGs.
   */
  /**
   * @brief Updates a live slot's product identity without rebuilding Kepler.
   */
  updateBodyDef(def: HeroBodyDef): void {
    const handle = this.bodies.get(def.key);
    if (!handle) return;
    handle.slug = def.slug;
    handle.diameter = def.diameter;
    handle.spinDur = def.spinDur;
    handle.spinRev = def.spinRev;
    handle.mesh.userData.slug = def.slug;
    void this.loadBodyArt(def);
  }

  async loadBodyArt(def: HeroBodyDef): Promise<boolean> {
    if (this.disposed) return false;
    const handle =
      def.kind === "sun" ? this.sun : this.bodies.get(def.key);
    if (!handle) return false;
    const url =
      def.kind === "sun"
        ? CYMASPHERE_SUN_POSTER
        : def.kind === "synth"
          ? CYMASYNTH_SPHERE_POSTER
          : heroBodyTextureUrl(def);
    if (!url) return false;
    if (handle.artUrl === url && handle.texture) return true;
    handle.artUrl = url;
    const tex = await loadHeroTexture(url);
    if (!tex || this.disposed || handle.artUrl !== url) {
      tex?.dispose();
      return false;
    }
    applyBodyTexture(handle, tex);
    return true;
  }

  evictArt(keep: ReadonlySet<string>): void {
    for (const [key, handle] of this.bodies) {
      if (keep.has(key)) continue;
      if (!handle.texture) continue;
      const fade = handle.wrap?.uniforms.uOpacity?.value;
      handle.texture.dispose();
      handle.texture = null;
      handle.artUrl = null;
      if (handle.wrap) {
        handle.wrap.dispose();
        handle.wrap = null;
        const prev = handle.mesh.material;
        handle.mesh.material = new MeshBasicMaterial({
          color: 0x7a7688,
          transparent: true,
          opacity: typeof fade === "number" ? fade : 0,
          depthWrite: false,
        });
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
    poseHeroSkybox(this.skybox, this.camera, this.world, performance.now() * 0.001);
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
    this.skybox.removeFromParent();
    disposeObject3D(this.skybox);
    if (this.synthRings) {
      this.synthRings.removeFromParent();
      disposeObject3D(this.synthRings);
    }
    this.renderer.dispose();
  }

  private syncSynthRings(defs: HeroBodyDef[]): void {
    const hasSynth = defs.some((d) => d.kind === "synth");
    if (!hasSynth) {
      if (this.synthRings) {
        this.synthRings.removeFromParent();
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
