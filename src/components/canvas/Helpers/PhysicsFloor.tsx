import { RigidBody } from "@react-three/rapier";

export function FloorWithPhysics() {
  return (
    <RigidBody type="fixed">
      <mesh receiveShadow position={[0, -3.5, 0]}>
        <boxGeometry args={[300, 5, 300]} />
        <meshStandardMaterial color="lightblue" />
      </mesh>
    </RigidBody>
  );
}
