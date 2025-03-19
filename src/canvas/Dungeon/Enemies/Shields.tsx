import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "src/@types";
import { Group, Mesh } from "three";

export const useShield = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-1-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Large_A.geometry,
    result.materials.skeleton
  );

  return shieldMesh;
};

export const useShield2 = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-2-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Small_B.geometry,
    result.materials.skeleton
  );

  return shieldMesh;
};

export const useShield3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-3-transformed.glb"
  ) as GLTFResult;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Small_A.geometry,
    materials.skeleton
  );

  return shieldMesh;
};

export const useShield4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-4-transformed.glb"
  ) as GLTFResult;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Large_B.geometry,
    materials.skeleton
  );

  return shieldMesh;
};
