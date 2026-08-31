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
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
  NoToneMapping,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  skyParallaxCss,
  SUN_FOCUS_KEY,
  type TourCamera,
} from "@/utils/circuit-network-layout";
import { facingPhaseFromDir, wrapPhase } from "@/utils/sphere-texture";
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
  createNebulae,
  createOrbitRings,
  createStarField,
  createSunAura,
  createSynthOscRings,
  disposeObject3D,
  poseOrbitRingsOpacity,
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

  private readonly sun: HeroBodyHandle;
  private readonly bodies = new Map<string, HeroBodyHandle>();
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
  private readonly towardCam = new Vector3();
  private readonly worldInv = new Matrix4();
  private synthBasePhase = 0;

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

    this.scene.add(new AmbientLight(0x8a7ab8, 0.55));
    const key = new DirectionalLight(0xfff6ea, 0.35);
    key.position.set(-0.58, 0.42, 0.12);
    key.target.position.set(0.18, -0.16, -1);
    this.camera.add(key);
    this.camera.add(key.target);

    this.sun = createSunMesh();
    this.sunGlow = createSunAura();
    this.sun.mesh.add(this.sunGlow);
    this.world.add(this.sun.mesh);

    this.stars = createStarField();
    this.sky.add(this.stars);
    this.nebulae = createNebulae();
    this.sun.mesh.add(this.nebulae);

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
      this.synthBasePhase = phase;
      if (handle.wrap) poseBodySpin(handle, phase);
      else handle.mesh.quaternion.identity();
      return;
    }
    poseBodySpin(handle, phase);
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
   * keeps an inertial seat so its rings stay in their plane; wrap art
   * faces the camera by phase, not mesh spin.
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
   * @brief Leaves CymaSynth un-rotated in the solar frame and rolls the
   * wrap so the mark still faces the camera.
   */
  private alignSynthSeat(): void {
    const synth = this.findSynth();
    if (!synth || !synth.mesh.visible) return;
    synth.mesh.quaternion.identity();
    synth.mesh.rotation.set(0, 0, 0);
    if (!synth.wrap) return;
    synth.mesh.updateMatrixWorld(true);
    synth.mesh.getWorldPosition(this.towardCam);
    this.towardCam.subVectors(this.camWorld, this.towardCam);
    if (this.towardCam.lengthSq() < 1e-10) return;
    this.worldInv.copy(this.world.matrixWorld).invert();
    this.towardCam.transformDirection(this.worldInv);
    poseBodySpin(
      synth,
      wrapPhase(
        this.synthBasePhase +
          facingPhaseFromDir(this.towardCam.x, this.towardCam.z)
      )
    );
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
    this.synthRings.position.copy(synth.mesh.position);
    this.synthRings.quaternion.identity();
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

  async loadBodyArt(def: HeroBodyDef): Promise<void> {
    if (this.disposed) return;
    const handle =
      def.kind === "sun" ? this.sun : this.bodies.get(def.key);
    if (!handle) return;
    const url =
      def.kind === "sun"
        ? CYMASPHERE_SUN_POSTER
        : def.kind === "synth"
          ? CYMASYNTH_SPHERE_POSTER
          : heroBodyTextureUrl(def);
    if (!url) return;
    if (handle.artUrl === url && handle.texture) return;
    handle.artUrl = url;
    const tex = await loadHeroTexture(url);
    if (!tex || this.disposed || handle.artUrl !== url) {
      tex?.dispose();
      return;
    }
    applyBodyTexture(handle, tex);
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
    if (this.synthRings) {
      this.synthRings.removeFromParent();
      disposeObject3D(this.synthRings);
    }
    disposeObject3D(this.stars);
    disposeObject3D(this.sunGlow);
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
