import { useGLTF } from "@react-three/drei";
import Ecctrl, { EcctrlAnimation } from "ecctrl";
import { useRef } from "react";
import { Group, Vector3 } from "three";

const characterURL = "/3d-assets/glb/Mixamo.glb";
useGLTF.preload(characterURL);

export function Model(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { nodes, materials } = useGLTF(characterURL) as any;

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
}

const animationSet = {
  idle: "Idle",
  walk: "Walk",
  run: "Run",
  jump: "Jump_Start",
  jumpIdle: "Fall_Idle",
  jumpLand: "Jump_Land",
};

export function ControlledCharacterModel() {
  return (
    <Ecctrl
      position={[0, 3, 0]}
      animated
      slopeDownExtraForce={0}
      camCollision={false}
      //   springK={2}
      //   dampingC={0.2}
      //   autoBalanceSpringK={1.2}
      //   autoBalanceDampingC={0.04}
      //   autoBalanceSpringOnY={0.7}
      //   autoBalanceDampingOnY={0.05}
    >
      <EcctrlAnimation characterURL={characterURL} animationSet={animationSet}>
        <Model />
      </EcctrlAnimation>
    </Ecctrl>
  );
}
