import { BiomeType, getBiome } from "@r3f/ChunkGenerationSystem/Biomes";
import {
  flatShading,
  mode,
  normalsDebug,
  tileSize,
  wireframe,
  withAutoComputedNormals,
} from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { TerrainData } from "@r3f/Workers/terrain/worker";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import { moistureNoise, temperatureNoise } from "src/lib/utils/noise";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";

const mat = new MeshPhysicalMaterial({
  color: "#EDC9AF",
  side: DoubleSide,
  flatShading,
  wireframe,
});

export const HeightfieldTileWithCollider = ({
  worldOffset,
  divisions,
}: {
  worldOffset: Vector3;
  divisions: number;
}) => {
  const { geo, heightfield } = useMemo(() => {
    const geo = new PlaneGeometry(
      tileSize,
      tileSize,
      divisions - 1,
      divisions - 1
    );

    if (!withAutoComputedNormals) return { geo, heightfield: [] };

    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position as Float32BufferAttribute;

    const n = divisions;
    const heightMap: number[][] = Array.from(Array(n), () => new Array(n));
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const ix = Math.floor(i % divisions);
      const iz = Math.floor(i / divisions);

      const height = getHeight(x + worldOffset.x, z + worldOffset.z).height;
      positions.setY(i, height);
      heightMap[iz][divisions + 1 - ix] = height;
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    return { geo, heightfield: heightMap.flat() };
  }, [worldOffset, divisions]);

  const workerRef = useRef<Worker>();

  const [ready, setReady] = useState(false);

  const geoRef = useRef(new BufferGeometry());
  const heightfieldRef = useRef<number[]>(
    Array.from(Array(Math.pow(divisions - 1, 2)), () => 0)
  );

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/terrain/worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (event: MessageEvent<TerrainData>) => {
      const { normals, uvs, vertices, colors, indices, heightfield } =
        event.data;

      heightfieldRef.current = heightfield;
      const geo = geoRef.current;

      geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
      geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
      geo.setAttribute("color", new Float32BufferAttribute(colors, 3));

      geo.setIndex(indices);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.attributes.uv.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      setReady(true);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;

    console.log("Posting message to terrain worker");
    setReady(false);
    workerRef.current.postMessage({ worldOffset, divisions });
  }, [worldOffset, divisions]);

  if (!ready) return null;

  console.log(heightfieldRef.current.length, divisions - 1);

  return (
    <RenderHeightfield
      geo={geoRef.current}
      heightfield={heightfieldRef.current}
      divisions={divisions}
    />
  );
};

const RenderHeightfield = ({
  geo,
  heightfield,
  divisions,
}: {
  geo: BufferGeometry;
  heightfield: number[];
  divisions: number;
}) => {
  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <RigidBody colliders={false}>
      {withAutoComputedNormals ? (
        <mesh
          ref={meshRef}
          geometry={geo}
          castShadow
          receiveShadow
          material={mat}
        />
      ) : (
        <mesh
          ref={meshRef}
          geometry={geo}
          material={mat}
          castShadow
          receiveShadow
        />
      )}

      <group rotation={[0, -Math.PI / 2, 0]}>
        {/* <HeightfieldCollider
          args={[
            divisions - 1,
            divisions - 1,
            heightfield,
            { x: tileSize, y: 1, z: tileSize },
          ]}
        /> */}
      </group>
    </RigidBody>
  );
};
