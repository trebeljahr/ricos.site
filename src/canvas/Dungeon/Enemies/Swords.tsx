import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "src/@types";
import { Group, Mesh } from "three";

export const useSword1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (1)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

export const useSword2 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (2)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1002.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

export const useSword3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (3)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1001.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

export const useSword4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (4)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

export const useSword5 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Blade-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Skeleton_Blade.geometry, materials.skeleton);

  swordMesh.rotation.set(0, Math.PI, 0);
  return swordMesh;
};

export const useSword6 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Sword_big_Golden.glb"
  ) as unknown as GLTFResult;

  const group = new Group();
  const swordMesh = new Mesh(
    nodes.Sword_big_Golden_1.geometry,
    materials.DarkWood
  );
  const swordMesh2 = new Mesh(
    nodes.Sword_big_Golden_2.geometry,
    materials.DarkSteel
  );
  const swordMesh3 = new Mesh(
    nodes.Sword_big_Golden_3.geometry,
    materials.LightWood
  );
  const swordMesh4 = new Mesh(
    nodes.Sword_big_Golden_4.geometry,
    materials.Golden
  );
  const swordMesh5 = new Mesh(
    nodes.Sword_big_Golden_5.geometry,
    materials.LightGold
  );
  group.add(swordMesh, swordMesh2, swordMesh3, swordMesh4, swordMesh5);

  return group;
};
