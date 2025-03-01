import { useRef, useEffect } from "react";

import { useGLTF } from "@react-three/drei";
import { generateTreePositions } from "../Yuka/YukaExample";
import { Group, InstancedMesh, Mesh, Object3D, Vector2 } from "three";

const treeArray = [
  {
    modelPath: "/3d-assets/glb/nature_pack/CommonTree_5.glb",
    positions: generateTreePositions(50, 100, 5), // Generate positions for this type
  },
  {
    modelPath: "/3d-assets/glb/nature_pack/BirchTree_1.glb",
    positions: generateTreePositions(30, 100, 5),
  },
];

export function InstancedTreeSystem() {
  return <InstancedTrees treeInstances={treeArray} />;
}

const temp = new Object3D();

function InstancedTrees({
  treeInstances,
}: {
  treeInstances: typeof treeArray;
}) {
  const groupRef = useRef<Group>(null!);

  useEffect(() => {
    if (!groupRef.current) return;

    treeInstances.forEach(({ positions, modelPath }, typeIndex) => {
      // const { nodes, materials } = useGLTF(modelPath);

      positions.forEach((pos, i) => {
        temp.position.set(pos.x, 0, pos.y);
        temp.rotation.y = Math.random() * Math.PI * 2;
        temp.scale.setScalar(0.8 + Math.random() * 0.4);
        temp.updateMatrix();

        const woodMesh = groupRef.current.children[
          typeIndex * 2
        ] as InstancedMesh; // Wood
        const leavesMesh = groupRef.current.children[
          typeIndex * 2 + 1
        ] as InstancedMesh; // Leaves

        woodMesh.setMatrixAt(i, temp.matrix);
        leavesMesh.setMatrixAt(i, temp.matrix);
      });

      groupRef.current.children.forEach(
        (mesh) => ((mesh as InstancedMesh).instanceMatrix.needsUpdate = true)
      );
    });
  }, [treeInstances]);

  // const birchTree = useGLTF("/3d-assets/glb/nature_pack/BirchTree_1.glb");
  // const commonTree = useGLTF("/3d-assets/glb/nature_pack/CommonTree_5.glb");

  return (
    <group ref={groupRef}>
      {treeInstances.map(({ modelPath, positions }, typeIndex) => {
        return (
          <SingleInstancedTree
            key={typeIndex}
            typeIndex={typeIndex}
            positions={positions}
            modelPath={modelPath}
          />
        );
      })}
    </group>
  );
}

type Props = {
  typeIndex: number;
  positions: Vector2[];
  modelPath: string;
};

const SingleInstancedTree = ({ typeIndex, positions, modelPath }: Props) => {
  const { nodes, materials } = useGLTF(modelPath);

  return (
    <>
      <instancedMesh
        key={`wood-${typeIndex}`}
        args={[
          (nodes.CommonTree_5_1 as Mesh).geometry,
          materials.Wood,
          positions.length,
        ]}
      >
        <meshStandardMaterial attach="material" {...materials.Wood} />
      </instancedMesh>
      <instancedMesh
        key={`leaves-${typeIndex}`}
        args={[
          (nodes.CommonTree_5_2 as Mesh).geometry,
          materials.Green,
          positions.length,
        ]}
      >
        <meshStandardMaterial attach="material" {...materials.Green} />
      </instancedMesh>
    </>
  );
};
