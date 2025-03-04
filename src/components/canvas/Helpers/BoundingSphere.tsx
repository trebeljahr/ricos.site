import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Box3, Mesh, Object3D, Sphere } from "three";

export function BoundingSphere({ object }: { object: Object3D }) {
  const ref = useRef<Mesh>(null!);
  const sphere = new Sphere();

  useFrame(() => {
    if (object) {
      const box = new Box3().setFromObject(object);
      box.getBoundingSphere(sphere);

      ref.current.position.copy(sphere.center);
      ref.current.scale.setScalar(sphere.radius);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="red" wireframe />
    </mesh>
  );
}
