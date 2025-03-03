import { usePrevious } from "@hooks/usePrevious";
import { extend, type Node, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useEffect, useRef } from "react";
import { BufferGeometry, Material, Object3D, Vector3 } from "three";

declare module "@react-three/fiber" {
  interface ThreeElements {
    instancedMesh2: Object3DNode<InstancedMesh2, typeof InstancedMesh2>;
  }
}

type Props = {
  geometry: BufferGeometry;
  material: Material;
  positions: Vector3[];
};

extend({ InstancedMesh2 });

const temp = new Object3D();

export function InstancedMesh2Component({
  geometry,
  material,
  positions,
}: Props) {
  const ref = useRef<InstancedMesh2>(null!);
  const { gl } = useThree();

  useEffect(() => {
    if (!ref.current) return;

    ref.current.addInstances(positions.length, (obj, index) => {
      obj.position.copy(positions[index]);

      temp.rotation.set(-Math.PI / 2, 0, 0);
      obj.quaternion.copy(temp.quaternion);
      obj.scale.multiplyScalar(100);
    });

    ref.current.computeBVH();
    (ref.current as any).frustumCulled = false;
  }, [positions]);

  return (
    <instancedMesh2 args={[geometry, material, { renderer: gl }]} ref={ref} />
  );
}
