import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { Group } from "three";

export const michelleGlbUrl = "/3d-assets/glb/Mixamo-transformed.glb";
useGLTF.preload(michelleGlbUrl);

export const MichelleCharacter = (props: JSX.IntrinsicElements["group"]) => {
  const group = useRef<Group>(null!);
  const { nodes, materials } = useGLTF(michelleGlbUrl) as any;

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group
          name="Michelle"
          position={[0, -0.8, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={0.009}
        >
          <skinnedMesh
            name="Ch03"
            geometry={nodes.Ch03.geometry}
            material={materials["Ch03_Body.002"]}
            skeleton={nodes.Ch03.skeleton}
          />
          <primitive object={nodes.mixamorigHips} />
        </group>
      </group>
    </group>
  );
};
