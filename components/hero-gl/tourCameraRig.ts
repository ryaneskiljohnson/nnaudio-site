/**
 * @fileoverview Maps the CSS 3D TourCamera (perspective 900 + scene
 * transform) onto a Three.js Y-up camera / world group.
 * @module components/hero-gl/tourCameraRig
 */

import {
  Group,
  Matrix4,
  PerspectiveCamera,
  type Object3D,
} from "three";
import {
  TOUR_PERSPECTIVE_PX,
  type TourCamera,
} from "@/utils/circuit-network-layout";

/** Column-major 4×4. */
export type Mat4 = Float64Array;

const DEG = Math.PI / 180;

/**
 * @brief Vertical FOV that matches CSS `perspective: P` on a board of height H.
 * @param viewHeightPx CSS board height.
 * @param perspectivePx CSS perspective (900).
 * @returns Field of view in degrees.
 */
export function cssPerspectiveFovDeg(
  viewHeightPx: number,
  perspectivePx: number = TOUR_PERSPECTIVE_PX
): number {
  const h = Math.max(1, viewHeightPx);
  const p = Math.max(1, perspectivePx);
  return (2 * Math.atan(h / 2 / p) * 180) / Math.PI;
}

/**
 * @brief Kepler seat in Three.js Y-up (CSS Y is down).
 * @param x World x (screen right).
 * @param height World height (up from the ecliptic).
 * @param z World z (toward the camera).
 */
export function keplerToThree(
  x: number,
  height: number,
  z: number
): { x: number; y: number; z: number } {
  return { x, y: height, z };
}

function mat4Identity(): Mat4 {
  return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

/** C = A × B (B applied first). Both column-major. */
export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function cssRotateX(deg: number): Mat4 {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return new Float64Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function cssRotateY(deg: number): Mat4 {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // CSS +Y-down rotateY: +X goes toward +Z (right edge comes forward).
  return new Float64Array([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]);
}

function cssRotateZ(deg: number): Mat4 {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return new Float64Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function cssTranslate(x: number, y: number, z: number): Mat4 {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/**
 * @brief CSS scene matrix: `translate3d · rotateX · rotateY · rotateZ`.
 * Matches {@link tourSceneCss} / CSS left-to-right multiply.
 * @param pose Tour camera (CSS space, Y down).
 */
export function composeCssTourMatrix(
  pose: Pick<
    TourCamera,
    "translateX" | "translateY" | "translateZ" | "rotateX" | "rotateY" | "rotateZ"
  >
): Mat4 {
  const t = cssTranslate(pose.translateX, pose.translateY, pose.translateZ);
  const rx = cssRotateX(pose.rotateX);
  const ry = cssRotateY(pose.rotateY);
  const rz = cssRotateZ(pose.rotateZ);
  return multiplyMat4(t, multiplyMat4(rx, multiplyMat4(ry, rz)));
}

const FLIP_Y = new Float64Array([
  1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

/**
 * @brief Converts a CSS (Y-down) matrix to Three.js Y-up: F · M · F.
 * @param css Column-major CSS matrix.
 */
export function cssMatrixToYUp(css: Mat4): Mat4 {
  return multiplyMat4(FLIP_Y, multiplyMat4(css, FLIP_Y));
}

/**
 * @brief Transforms a CSS-space point by a CSS matrix.
 * @param m Column-major matrix.
 * @param x CSS x.
 * @param y CSS y (down).
 * @param z CSS z (toward camera).
 */
export function transformCssPoint(
  m: Mat4,
  x: number,
  y: number,
  z: number
): { x: number; y: number; z: number } {
  return {
    x: m[0] * x + m[4] * y + m[8] * z + m[12],
    y: m[1] * x + m[5] * y + m[9] * z + m[13],
    z: m[2] * x + m[6] * y + m[10] * z + m[14],
  };
}

/**
 * @brief Projects a Kepler seat through the CSS tour camera to the board.
 * Used to lock look-at framing against the old CSS perspective.
 * @param pose Tour camera.
 * @param viewWidth Board CSS width.
 * @param viewHeight Board CSS height.
 * @param worldX Kepler x.
 * @param worldHeight Kepler height (up).
 * @param worldZ Kepler z (toward camera).
 * @returns Pixel position (origin top-left, y down).
 */
export function projectKeplerToBoard(
  pose: Pick<
    TourCamera,
    "translateX" | "translateY" | "translateZ" | "rotateX" | "rotateY" | "rotateZ"
  >,
  viewWidth: number,
  viewHeight: number,
  worldX: number,
  worldHeight: number,
  worldZ: number,
  perspectivePx: number = TOUR_PERSPECTIVE_PX
): { x: number; y: number } {
  const m = composeCssTourMatrix(pose);
  const p = transformCssPoint(m, worldX, -worldHeight, worldZ);
  const denom = Math.max(1e-4, perspectivePx - p.z);
  return {
    x: viewWidth / 2 + (p.x * perspectivePx) / denom,
    y: viewHeight / 2 + (p.y * perspectivePx) / denom,
  };
}

const scratch = new Matrix4();

/**
 * @brief Writes the CSS tour pose onto a Three.js Y-up world group.
 * @param world Scene-graph root for Kepler bodies.
 * @param pose Live TourCamera.
 */
export function applyTourWorldMatrix(
  world: Object3D,
  pose: Pick<
    TourCamera,
    "translateX" | "translateY" | "translateZ" | "rotateX" | "rotateY" | "rotateZ"
  >
): void {
  const yUp = cssMatrixToYUp(composeCssTourMatrix(pose));
  scratch.fromArray(Array.from(yUp));
  world.matrix.copy(scratch);
  world.matrixAutoUpdate = false;
  world.matrixWorldNeedsUpdate = true;
}

/**
 * @brief Places the viewer like CSS perspective on the board.
 * FOV uses CSS height, not the 1080p drawing buffer.
 * @param camera Perspective camera.
 * @param viewWidth CSS board width.
 * @param viewHeight CSS board height.
 */
export function applyCssPerspectiveCamera(
  camera: PerspectiveCamera,
  viewWidth: number,
  viewHeight: number,
  perspectivePx: number = TOUR_PERSPECTIVE_PX
): void {
  camera.fov = cssPerspectiveFovDeg(viewHeight, perspectivePx);
  camera.aspect = Math.max(1e-4, viewWidth) / Math.max(1e-4, viewHeight);
  camera.near = 2;
  camera.far = 20000;
  camera.position.set(0, 0, perspectivePx);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

/**
 * @brief Extra mouse-look Euler added to a pose (desktop only).
 * @param pose Base tour pose.
 * @param lookX Yaw nudge in degrees.
 * @param lookY Pitch nudge in degrees.
 */
export function withMouseLook(
  pose: TourCamera,
  lookX: number,
  lookY: number
): TourCamera {
  return {
    ...pose,
    rotateX: pose.rotateX + lookY,
    rotateY: pose.rotateY + lookX,
  };
}

/** Unused import guard — Group is documented as the typical `world` type. */
export type TourWorld = Group;
