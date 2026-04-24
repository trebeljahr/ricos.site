import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ship_pinnace_aft: Mesh;
    ship_pinnace_rigging: Mesh;
    ship_pinnace_details: Mesh;
    ship_pinnace_hull: Mesh;
    ship_pinnace_deck: Mesh;
    ship_pinnace_interior: Mesh;
    ship_pinnace_sails: Mesh;
  };
  materials: {
    ship_pinnace_aft: MeshStandardMaterial;
    ship_pinnace_rigging: MeshStandardMaterial;
    ship_pinnace_details: MeshStandardMaterial;
    ship_pinnace_hull: MeshStandardMaterial;
    ship_pinnace_deck: MeshStandardMaterial;
    ship_pinnace_interior: MeshStandardMaterial;
    ship_pinnace_sails: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/ship.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.ship_pinnace_aft.geometry} material={materials.ship_pinnace_aft} />
      <mesh
        geometry={nodes.ship_pinnace_rigging.geometry}
        material={materials.ship_pinnace_rigging}
      />
      <mesh
        geometry={nodes.ship_pinnace_details.geometry}
        material={materials.ship_pinnace_details}
      />
      <mesh geometry={nodes.ship_pinnace_hull.geometry} material={materials.ship_pinnace_hull} />
      <mesh geometry={nodes.ship_pinnace_deck.geometry} material={materials.ship_pinnace_deck} />
      <mesh
        geometry={nodes.ship_pinnace_interior.geometry}
        material={materials.ship_pinnace_interior}
      />
      <mesh geometry={nodes.ship_pinnace_sails.geometry} material={materials.ship_pinnace_sails} />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/ship.glb");
