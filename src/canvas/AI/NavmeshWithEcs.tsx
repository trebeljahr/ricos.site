import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { NavMeshHelper, threeToSoloNavMesh } from "@recast-navigation/three";
import { useEffect, useRef, useState } from "react";
import { NavMeshQuery } from "recast-navigation";
import { Mesh, MeshStandardMaterial } from "three";
import { Entity, NavComponent, navQuery } from "./ecs";
import { useConst } from "@hooks/useConst";

export const NavmeshDebug = () => {
  const [helper, setHelper] = useState<NavMeshHelper>();
  const prevNavMeshVersion = useRef<number>(0);

  useFrame(() => {
    const nav = navQuery.first;

    if (!nav || !nav.nav.navMesh) {
      if (helper) {
        setHelper(undefined);
      }

      return;
    }

    const navMesh = nav.nav.navMesh;
    const navMeshVersion = nav.nav.navMeshVersion;

    if (navMeshVersion !== prevNavMeshVersion.current) {
      prevNavMeshVersion.current = navMeshVersion;

      const helper = new NavMeshHelper(navMesh, {
        navMeshMaterial: new MeshStandardMaterial({
          color: "#18e118",
          opacity: 0.3,
          transparent: true,
          depthWrite: false,
        }),
      });

      setHelper(helper);
    }
  });

  return <>{helper && <primitive object={helper} />}</>;
};

export const NavmeshEcs = () => {
  const navmeshThing = useGLTF("/3d-assets/glb/nav_test.glb");

  const nav = useConst<NavComponent>(() => ({
    navMesh: undefined,
    navMeshQuery: undefined,
    navMeshVersion: 0,
  }));

  const size = 5;

  useEffect(() => {
    const meshes: Mesh[] = [];
    // navmeshThing.scene.scale.set(5, 5, 5);

    navmeshThing.scene.traverse((child) => {
      if (child instanceof Mesh) {
        const childClone = child.clone();
        childClone.scale.set(size, size, size);
        // childClone.geometry.computeBoundingBox();
        // childClone.geometry.computeBoundingSphere();
        // childClone.geometry.computeVertexNormals();
        // childClone.geometry.computeTangents();
        // childClone.matrixWorldNeedsUpdate = true;
        meshes.push(childClone);
      }
    });

    const cs = 0.05;
    const ch = 0.05;
    const walkableRadius = 0.2;
    const walkableHeight = 1;
    const walkableClimb = 1;

    const { success, navMesh } = threeToSoloNavMesh(meshes, {
      cs,
      ch,
      walkableRadius: Math.round(walkableRadius / ch),
      walkableHeight: Math.round(walkableHeight / ch),
      walkableClimb: Math.round(walkableClimb / ch),
    });

    if (!navMesh) return;

    const navMeshQuery = new NavMeshQuery(navMesh);

    nav.navMesh = navMesh;
    nav.navMeshQuery = navMeshQuery;
    nav.navMeshVersion = 1;

    return () => {
      nav.navMesh?.destroy();
      nav.navMeshQuery?.destroy();
    };
  }, [navmeshThing.scene, nav]);

  return (
    <>
      <Entity nav={nav} />
      <group scale={size}>
        <RigidBody type="fixed" position={[0, 0, 0]} colliders={"trimesh"}>
          <primitive object={navmeshThing.scene} />
        </RigidBody>
      </group>
    </>
  );
};
