import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import type { TriangleSoup } from "../Particles/BoidSwarm/meshDistance";
import type { ObstacleField } from "../Particles/BoidSwarm/obstacleField";
import { pointsDistance, surfacePoints } from "../Particles/BoidSwarm/pointDistance";
import { sampleSeabedHeight } from "./lagoonTerrain";

const FOLDER = "/3d-assets/glb/wreck/";

/** Where the wreck lies: east of the large reef, on the flat of the shelf. */
export const WRECK_SITE = { x: 19, z: 26 } as const;

interface WreckPart {
  model: string;
  /** Offset from the site, east and south. */
  dx: number;
  dz: number;
  /** Height of the model's origin above the seabed. */
  lift: number;
  /** Roll about the long axis, heading, pitch. */
  rotation: [number, number, number];
  scale: number;
}

// The ship lies on its side with the masts pointing away from the reef; the
// rest is what fell off it.
const PARTS: readonly WreckPart[] = [
  { model: "ship-large", dx: 0, dz: 0, lift: 2.3, rotation: [0.62, 2.5, 0.07], scale: 1.15 },
  { model: "prop-anchor", dx: -9.5, dz: 2.5, lift: 0.15, rotation: [0.1, 0.7, 0], scale: 4 },
  {
    model: "prop-chest-gold",
    dx: -5.5,
    dz: -6.5,
    lift: -0.25,
    rotation: [0.12, 2.1, -0.1],
    scale: 1.4,
  },
  { model: "prop-cannon", dx: 3.5, dz: -7, lift: 0.45, rotation: [0.5, 0.9, 0.2], scale: 1.6 },
  { model: "prop-barrel", dx: -2.5, dz: -8.2, lift: 0.3, rotation: [1.45, 0.4, 0], scale: 1.5 },
  { model: "prop-barrel", dx: 6.2, dz: -5.2, lift: -0.2, rotation: [0.2, 1.3, 0.15], scale: 1.5 },
  {
    model: "environment-largebones",
    dx: 9.5,
    dz: 7.5,
    lift: 0.3,
    rotation: [0, 0.6, 0],
    scale: 1.1,
  },
];

const PATHS = [...new Set(PARTS.map((p) => p.model))].map((model) => `${FOLDER}${model}.glb`);

/** Years under water: the paint is dull and a little green. */
const SUNKEN_TINT = new Color(0.62, 0.74, 0.68);

function sunkenCopy(scene: Object3D): Object3D {
  const copy = scene.clone(true);
  copy.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const material = (mesh.material as MeshStandardMaterial).clone();
    material.color.multiply(SUNKEN_TINT);
    material.roughness = 0.95;
    material.metalness = 0;
    mesh.material = material;
  });
  return copy;
}

/**
 * A sunken ship and its scattered cargo. Once the models are in place their
 * faces are added to `field`, so fish steer around the hull, the masts and
 * the sails, and still pass through the gaps between them.
 */
export function Shipwreck({ field }: { field: ObstacleField }) {
  const group = useRef<Group>(null);
  const models = useGLTF(PATHS);
  const parts = useMemo(
    () =>
      PARTS.map((part, i) => {
        const x = WRECK_SITE.x + part.dx;
        const z = WRECK_SITE.z + part.dz;
        return {
          key: `${part.model}-${i}`,
          object: sunkenCopy(models[PATHS.indexOf(`${FOLDER}${part.model}.glb`)].scene),
          position: [x, sampleSeabedHeight(x, z) + part.lift, z] as [number, number, number],
          rotation: [part.rotation[0], part.rotation[1], part.rotation[2], "YXZ"] as const,
          scale: part.scale,
        };
      }),
    [models],
  );
  useEffect(
    () => () => {
      for (const part of parts) {
        part.object.traverse((object) => {
          const mesh = object as Mesh;
          if (mesh.isMesh) (mesh.material as MeshStandardMaterial).dispose();
        });
      }
    },
    [parts],
  );

  useLayoutEffect(() => {
    const root = group.current;
    if (!root || parts.length === 0) return;
    root.updateMatrixWorld(true);
    const soups: TriangleSoup[] = [];
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      soups.push({
        positions: mesh.geometry.getAttribute("position").array,
        index: mesh.geometry.index?.array,
        matrix: mesh.matrixWorld.elements,
      });
    });
    const solid = pointsDistance(surfacePoints(soups, 0.45), 0.35);
    field.add(solid.distance, solid.bounds);
  }, [field, parts]);

  return (
    <group ref={group}>
      {parts.map((part) => (
        <primitive
          key={part.key}
          object={part.object}
          position={part.position}
          rotation={part.rotation}
          scale={part.scale}
        />
      ))}
    </group>
  );
}

for (const path of PATHS) useGLTF.preload(path);
