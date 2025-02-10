import { ControlledCharacterModel } from "@components/canvas/ControlledCharacterModel";
import Grass from "@components/canvas/Grass";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { EcctrlJoystick } from "ecctrl";
import { useRef } from "react";
import { DirectionalLight } from "three";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["Shift"] },
];

export function Floor() {
  return (
    <RigidBody type="fixed">
      <mesh receiveShadow position={[0, -3.5, 0]}>
        <boxGeometry args={[300, 5, 300]} />
        <meshStandardMaterial color="lightblue" />
      </mesh>
    </RigidBody>
  );
}

export function Lights() {
  const directionalLightRef = useRef<DirectionalLight>(null!);

  return (
    <>
      <directionalLight
        castShadow
        shadow-normalBias={0.06}
        position={[20, 30, 10]}
        intensity={5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-top={50}
        shadow-camera-right={50}
        shadow-camera-bottom={-50}
        shadow-camera-left={-50}
        name="followLight"
        ref={directionalLightRef}
      />
      <ambientLight intensity={2} />
    </>
  );
}

export default function Page() {
  return (
    <ThreeFiberLayout>
      <EcctrlJoystick />

      <Canvas>
        <Physics debug timeStep="vary">
          <KeyboardControls map={keyboardMap}>
            <ControlledCharacterModel />
          </KeyboardControls>
          {/* <Floor /> */}
          <Lights />
          <Sky />
          <Grass size={0.3} />
        </Physics>
      </Canvas>
    </ThreeFiberLayout>
  );
}
