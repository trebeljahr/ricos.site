import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Hammer_Double_1: Mesh;
    Hammer_Double_2: Mesh;
    Hammer_Double_3: Mesh;
    Hammer_Double_4: Mesh;
  };
  materials: {
    Steel: MeshStandardMaterial;
    LightSteel: MeshStandardMaterial;
    DarkWood: MeshStandardMaterial;
    LightWood: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Hammer_Double.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Hammer_Double_1.geometry} material={materials.Steel} />
        <mesh geometry={nodes.Hammer_Double_2.geometry} material={materials.LightSteel} />
        <mesh geometry={nodes.Hammer_Double_3.geometry} material={materials.DarkWood} />
        <mesh geometry={nodes.Hammer_Double_4.geometry} material={materials.LightWood} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Hammer_Double.glb");
