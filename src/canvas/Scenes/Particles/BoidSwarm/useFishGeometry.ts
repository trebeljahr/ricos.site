import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";
import { createFishGeometry, type FishPart } from "./fishMesh";

const MODEL_ROOT = "/3d-assets/glb/";
const DEFAULT_FOLDER = "fish_pack";

function swimReady(scene: Object3D): BufferGeometry {
  const parts: FishPart[] = [];
  scene.traverse((object) => {
    const mesh = object as Mesh<BufferGeometry, MeshStandardMaterial>;
    if (mesh.isMesh) parts.push({ geometry: mesh.geometry, color: mesh.material.color });
  });
  return createFishGeometry(parts);
}

/** One model of a fish pack as a swim-ready geometry. */
export function useFishGeometry(name: string, folder = DEFAULT_FOLDER): BufferGeometry {
  const { scene } = useGLTF(`${MODEL_ROOT}${folder}/${name}.glb`);
  return useMemo(() => swimReady(scene), [scene]);
}

/** Several models at once. `names` must be a constant list. */
export function useFishGeometries(
  names: readonly string[],
  folder = DEFAULT_FOLDER,
): BufferGeometry[] {
  const paths = useMemo(
    () => names.map((name) => `${MODEL_ROOT}${folder}/${name}.glb`),
    [names, folder],
  );
  const models = useGLTF(paths);
  return useMemo(() => models.map((model) => swimReady(model.scene)), [models]);
}

export function preloadFishModels(names: readonly string[], folder = DEFAULT_FOLDER): void {
  for (const name of names) useGLTF.preload(`${MODEL_ROOT}${folder}/${name}.glb`);
}
