import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { createFishGeometry, type FishPart } from "./fishMesh";

const MODEL_PATH = "/3d-assets/glb/fish_pack/";

export type FishModel = "Fish1" | "Fish2" | "Fish3" | "Dolphin" | "Manta_ray" | "Shark";

/** One model of the fish pack as a swim-ready geometry. */
export function useFishGeometry(name: FishModel): BufferGeometry {
  const { scene } = useGLTF(`${MODEL_PATH}${name}.glb`);
  return useMemo(() => {
    const parts: FishPart[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh<BufferGeometry, MeshStandardMaterial>;
      if (mesh.isMesh) parts.push({ geometry: mesh.geometry, color: mesh.material.color });
    });
    return createFishGeometry(parts);
  }, [scene]);
}

export function preloadFishModels(names: readonly FishModel[]): void {
  for (const name of names) useGLTF.preload(`${MODEL_PATH}${name}.glb`);
}
