import {
  lookAt,
  type Mat,
  multiply,
  multiplyAll,
  orbitEye,
  perspective,
  radians,
  rotateX,
  rotateY,
  scale3,
  transform,
  translate3,
  type Vec3,
  type Vec4,
  viewport,
} from "./matrix";
import { insideClip } from "./rasterizer";

export type PipelineSettings = {
  /** Object in the world. */
  position: Vec3;
  yaw: number;
  pitch: number;
  scale: number;
  /** Camera. */
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;
  /** Lens. */
  fov: number;
  near: number;
  far: number;
  /** Screen, in pixels. */
  width: number;
  height: number;
};

export type PipelineMatrices = {
  model: Mat;
  view: Mat;
  projection: Mat;
  viewport: Mat;
  eye: Vec3;
};

export function pipelineMatrices(settings: PipelineSettings): PipelineMatrices {
  const eye = orbitEye(settings.cameraYaw, settings.cameraPitch, settings.cameraDistance);
  return {
    eye,
    model: multiplyAll(
      translate3(...settings.position),
      rotateY(radians(settings.yaw)),
      rotateX(radians(settings.pitch)),
      scale3(settings.scale, settings.scale, settings.scale),
    ),
    view: lookAt(eye, [0, 0, 0]),
    projection: perspective(
      settings.fov,
      settings.width / settings.height,
      settings.near,
      settings.far,
    ),
    viewport: viewport(settings.width, settings.height),
  };
}

/** One corner's numbers at each stop. */
export type VertexJourney = {
  local: Vec4;
  world: Vec4;
  view: Vec4;
  clip: Vec4;
  inside: boolean;
  /** Missing when the corner is at or behind the camera, where dividing by w means nothing. */
  ndc: Vec3 | null;
  screen: Vec3 | null;
  pixel: readonly [number, number] | null;
};

const asVec4 = (v: number[]): Vec4 => [v[0], v[1], v[2], v[3]];

export function vertexJourney(
  position: Vec3,
  matrices: PipelineMatrices,
  width: number,
  height: number,
): VertexJourney {
  const local: Vec4 = [position[0], position[1], position[2], 1];
  const world = asVec4(transform(matrices.model, local));
  const view = asVec4(transform(matrices.view, world));
  const clip = asVec4(transform(matrices.projection, view));
  if (clip[3] <= 0) {
    return { local, world, view, clip, inside: false, ndc: null, screen: null, pixel: null };
  }
  const ndc: Vec3 = [clip[0] / clip[3], clip[1] / clip[3], clip[2] / clip[3]];
  const [sx, sy, sz] = transform(matrices.viewport, [ndc[0], ndc[1], ndc[2], 1]);
  return {
    local,
    world,
    view,
    clip,
    inside: insideClip(clip),
    ndc,
    screen: [sx, sy, sz],
    pixel:
      sx >= 0 && sx < width && sy >= 0 && sy < height ? [Math.floor(sx), Math.floor(sy)] : null,
  };
}

/** The matrix that takes any corner from its model coordinates all the way to clip space. */
export const modelViewProjection = (matrices: PipelineMatrices): Mat =>
  multiply(matrices.projection, multiply(matrices.view, matrices.model));

export const STAGES = ["local", "world", "view", "clip", "ndc", "screen", "pixels"] as const;
export type Stage = (typeof STAGES)[number];
