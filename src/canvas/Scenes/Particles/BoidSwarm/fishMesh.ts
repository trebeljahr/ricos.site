// Geometry and material for swarm fish. One draw call per species: the
// geometry is instanced, and each instance looks its boid up in the state
// textures by `aRef`.

import {
  BufferAttribute,
  BufferGeometry,
  type Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type IUniform,
  Matrix4,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  Vector3,
} from "three";
import type { FishTextureUniforms } from "./GpuBoidSwarm";
import type { SwimStyle } from "./swarmConfig";
import { FISH_VERTEX_PARS } from "./swarmShaders";

export interface FishPart {
  geometry: BufferGeometry;
  color: Color;
}

/**
 * Merges a model's parts into the shape the swim shader expects: one body
 * length long, nose at +Z, back at +Y, centred, with the part colours baked
 * into vertex colours. The fish pack models lie along Y with their back at +Z.
 */
export function createFishGeometry(parts: readonly FishPart[], noseAtPositiveY = false) {
  let vertexCount = 0;
  let indexCount = 0;
  for (const { geometry } of parts) {
    vertexCount += geometry.getAttribute("position").count;
    indexCount += geometry.index ? geometry.index.count : geometry.getAttribute("position").count;
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);

  let vertex = 0;
  let index = 0;
  for (const { geometry, color } of parts) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      const o = (vertex + i) * 3;
      positions[o] = position.getX(i);
      positions[o + 1] = position.getY(i);
      positions[o + 2] = position.getZ(i);
      if (normal) {
        normals[o] = normal.getX(i);
        normals[o + 1] = normal.getY(i);
        normals[o + 2] = normal.getZ(i);
      }
      colors[o] = color.r;
      colors[o + 1] = color.g;
      colors[o + 2] = color.b;
    }
    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i++) {
        indices[index++] = geometry.index.getX(i) + vertex;
      }
    } else {
      for (let i = 0; i < position.count; i++) indices[index++] = vertex + i;
    }
    vertex += position.count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute("position", new BufferAttribute(positions, 3));
  merged.setAttribute("normal", new BufferAttribute(normals, 3));
  merged.setAttribute("color", new BufferAttribute(colors, 3));
  merged.setIndex(new BufferAttribute(indices, 1));

  // Y is the body axis in the source models. Stand the fish up, nose to +Z.
  merged.applyMatrix4(new Matrix4().makeRotationX(noseAtPositiveY ? Math.PI / 2 : -Math.PI / 2));
  if (noseAtPositiveY) merged.applyMatrix4(new Matrix4().makeRotationZ(Math.PI));
  merged.computeBoundingBox();
  const box = merged.boundingBox;
  if (box) {
    const centre = box.getCenter(new Vector3());
    const length = Math.max(1e-6, box.max.z - box.min.z);
    merged.translate(-centre.x, -centre.y, -centre.z);
    merged.scale(1 / length, 1 / length, 1 / length);
  }
  if (!parts[0]?.geometry.getAttribute("normal")) merged.computeVertexNormals();
  return merged;
}

/** Instances for the boids `start … start + count - 1` of a state texture `texWidth` wide. */
export function createFishInstances(
  fish: BufferGeometry,
  texWidth: number,
  start: number,
  count: number,
): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.index = fish.index;
  for (const name of ["position", "normal", "color"]) {
    geometry.setAttribute(name, fish.getAttribute(name));
  }
  const refs = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const boid = start + i;
    refs[i * 2] = boid % texWidth;
    refs[i * 2 + 1] = Math.floor(boid / texWidth);
  }
  geometry.setAttribute("aRef", new InstancedBufferAttribute(refs, 2));
  geometry.instanceCount = count;
  return geometry;
}

export interface FishMaterialOptions extends MeshStandardMaterialParameters {
  /** Body length in world units. */
  size: number;
  swimStyle?: SwimStyle;
  swimAmplitude?: number;
  bend?: number;
}

const STYLE: Record<SwimStyle, number> = { fish: 0, cetacean: 1, ray: 2 };

/**
 * A standard material whose vertices are animated and placed by the swarm.
 * The mesh that uses it must sit at the world origin, unrotated and unscaled:
 * the state textures hold world positions.
 */
export function createFishMaterial(
  textures: FishTextureUniforms,
  { size, swimStyle = "fish", swimAmplitude = 1, bend = 1, ...standard }: FishMaterialOptions,
): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.45,
    metalness: 0.1,
    ...standard,
  });
  const uFish: IUniform<number[]> = { value: [size, swimAmplitude, bend, STYLE[swimStyle]] };
  material.userData.uFish = uFish;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, textures, { uFish });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${FISH_VERTEX_PARS}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        vec3 swarmPosition = position;
        vec3 swarmNormal = normal;
        swarmFish(swarmPosition, swarmNormal);
        vec3 objectNormal = swarmNormal;
        `,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = swarmPosition;");
  };
  material.customProgramCacheKey = () => "boid-swarm-fish";
  return material;
}
