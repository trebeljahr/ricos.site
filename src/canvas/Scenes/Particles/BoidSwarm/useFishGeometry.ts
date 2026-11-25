import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import {
  type BufferGeometry,
  Color,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { createFishGeometry, type FishPart } from "./fishMesh";

const MODEL_ROOT = "/3d-assets/glb/";
const DEFAULT_FOLDER = "fish_pack";

/** New colours for a model's parts, by material name, for example `{ Body: "#ffd632" }`. */
export type FishColors = Readonly<Record<string, string>>;

function swimReady(scene: Object3D, colors?: FishColors): BufferGeometry {
  const parts: FishPart[] = [];
  scene.traverse((object) => {
    const mesh = object as Mesh<BufferGeometry, MeshStandardMaterial>;
    if (!mesh.isMesh) return;
    const repaint = colors?.[mesh.material.name];
    parts.push({
      geometry: mesh.geometry,
      color: repaint ? new Color(repaint) : mesh.material.color,
    });
  });
  return createFishGeometry(parts);
}

/** One model of a fish pack as a swim-ready geometry. */
export function useFishGeometry(name: string, folder = DEFAULT_FOLDER): BufferGeometry {
  const { scene } = useGLTF(`${MODEL_ROOT}${folder}/${name}.glb`);
  return useMemo(() => swimReady(scene), [scene]);
}

/**
 * Several geometries at once; a model may appear more than once with other
 * colours. `names` and `colors` must be constant lists of the same length.
 */
export function useFishGeometries(
  names: readonly string[],
  colors?: readonly (FishColors | undefined)[],
  folder = DEFAULT_FOLDER,
): BufferGeometry[] {
  const paths = useMemo(
    () => names.map((name) => `${MODEL_ROOT}${folder}/${name}.glb`),
    [names, folder],
  );
  const models = useGLTF(paths);
  return useMemo(
    () => models.map((model, i) => swimReady(model.scene, colors?.[i])),
    [models, colors],
  );
}

export function preloadFishModels(names: readonly string[], folder = DEFAULT_FOLDER): void {
  for (const name of names) useGLTF.preload(`${MODEL_ROOT}${folder}/${name}.glb`);
}
