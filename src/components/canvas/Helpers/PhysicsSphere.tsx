import { BallCollider, RigidBody } from "@react-three/rapier";

export const SphereWithPhysics = () => {
  return (
    <RigidBody
      linearDamping={4}
      angularDamping={1}
      friction={0.1}
      position={[0, 10, 0]}
      colliders={false}
    >
      <BallCollider args={[1]} />
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={"red"} />
      </mesh>
    </RigidBody>
  );
};
