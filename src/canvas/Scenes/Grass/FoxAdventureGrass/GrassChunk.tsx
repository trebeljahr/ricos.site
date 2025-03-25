import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  RepeatWrapping,
  ShaderMaterial,
  Vector3,
} from "three";
import fragmentShader from "./shaders/grassFragmentShader.glsl";
import vertexShader from "./shaders/grassVertexShader.glsl";
import { TerrainData } from "./generateTerrainData";

const BLADE_COUNT = 1000;
const BLADE_WIDTH = 0.07;
const BLADE_HEIGHT = 0.17;
const BLADE_HEIGHT_VARIATION = 0.15;

function remap(
  val: number,
  oldMin: number,
  oldMax: number,
  newMin: number,
  newMax: number
) {
  return ((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;
}

function generateBlade(
  center: Vector3,
  vArrOffset: number,
  uv: [number, number]
) {
  const MID_WIDTH = BLADE_WIDTH * 0.5;
  const TIP_OFFSET = 0.1;
  const height = BLADE_HEIGHT + Math.random() * BLADE_HEIGHT_VARIATION;

  const rotationBias = Math.atan2(center.z, center.x);
  const yaw = rotationBias + (Math.random() - 0.5) * Math.PI * 0.5;
  const yawUnitVec = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  const tipBend = yaw + (Math.random() - 0.5) * Math.PI * 0.25;
  const tipBendUnitVec = new Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

  const bl = new Vector3().addVectors(
    center,
    new Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1)
  );
  const br = new Vector3().addVectors(
    center,
    new Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1)
  );
  const tl = new Vector3().addVectors(
    center,
    new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1)
  );
  const tr = new Vector3().addVectors(
    center,
    new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1)
  );
  const tc = new Vector3().addVectors(
    center,
    new Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET)
  );

  tl.y += height / 2;
  tr.y += height / 2;
  tc.y += height;

  const black = [0, 0, 0];
  const gray = [0.5, 0.5, 0.5];
  const white = [1.0, 1.0, 1.0];

  const verts = [
    { pos: bl.toArray(), uv: uv, color: black },
    { pos: br.toArray(), uv: uv, color: black },
    { pos: tr.toArray(), uv: uv, color: gray },
    { pos: tl.toArray(), uv: uv, color: gray },
    { pos: tc.toArray(), uv: uv, color: white },
  ];

  const indices = [
    vArrOffset,
    vArrOffset + 1,
    vArrOffset + 2,
    vArrOffset + 2,
    vArrOffset + 4,
    vArrOffset + 3,
    vArrOffset + 3,
    vArrOffset,
    vArrOffset + 2,
  ];

  return { verts, indices };
}

type GrassChunkProps = {
  offsetX: number;
  offsetZ: number;
  chunkSize: number;
  planeSize: number;
  terrainData: TerrainData;
};

export const GrassPlane = ({
  terrainData,
  offsetX,
  offsetZ,
  chunkSize,
  planeSize,
}: GrassChunkProps) => {
  const meshRef = useRef<Mesh>(null!);

  const startTime = useRef(Date.now());
  const foxPosition = new Vector3(0, 0, 0);

  const grassTexture = useTexture("/3d-assets/grass/grass.jpg");
  const cloudTexture = useTexture("/3d-assets/grass/cloud.jpg");

  cloudTexture.wrapS = cloudTexture.wrapT = RepeatWrapping;

  const getTerrainHeight = (x: number, z: number) => {
    if (!terrainData) return 0;

    const gridX = Math.max(
      0,
      Math.min(
        terrainData.nsubdivs,
        (x / terrainData.scale.x + 0.5) * terrainData.nsubdivs
      )
    );
    const gridZ = Math.max(
      0,
      Math.min(
        terrainData.nsubdivs,
        (z / terrainData.scale.z + 0.5) * terrainData.nsubdivs
      )
    );

    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, terrainData.nsubdivs);
    const z1 = Math.min(z0 + 1, terrainData.nsubdivs);

    const wx = gridX - x0;
    const wz = gridZ - z0;

    const h00 =
      terrainData.heights[x0 * (terrainData.nsubdivs + 1) + z0] *
      terrainData.scale.y;
    const h10 =
      terrainData.heights[x1 * (terrainData.nsubdivs + 1) + z0] *
      terrainData.scale.y;
    const h01 =
      terrainData.heights[x0 * (terrainData.nsubdivs + 1) + z1] *
      terrainData.scale.y;
    const h11 =
      terrainData.heights[x1 * (terrainData.nsubdivs + 1) + z1] *
      terrainData.scale.y;

    const h0 = h00 * (1 - wx) + h10 * wx;
    const h1 = h01 * (1 - wx) + h11 * wx;
    return h0 * (1 - wz) + h1 * wz;
  };

  const uniforms = useMemo(
    () => ({
      textures: { value: [grassTexture, cloudTexture] },
      iTime: { value: 0.0 },
      foxPosition: { value: foxPosition },
    }),
    [grassTexture, cloudTexture]
  );

  useFrame(({ camera }, delta) => {
    if (meshRef.current) {
      uniforms.iTime.value = Date.now() - startTime.current;
      // uniforms.foxPosition.value.copy(camera.position);
    }
  });

  const geometry = useMemo(() => {
    if (!terrainData) return null;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const gridSize = Math.sqrt(BLADE_COUNT);
    const cellSize = chunkSize / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const baseX = (i / gridSize - 0.5) * chunkSize;
        const baseZ = (j / gridSize - 0.5) * chunkSize;

        const offsetX = (Math.random() - 0.5) * cellSize * 0.8;
        const offsetZ = (Math.random() - 0.5) * cellSize * 0.8;

        const x = baseX + offsetX;
        const z = baseZ + offsetZ;

        if (Math.abs(x) <= chunkSize / 2 && Math.abs(z) <= chunkSize / 2) {
          const y = getTerrainHeight(x, z);
          const pos = new Vector3(x, y, z);

          const uv: [number, number] = [
            remap(x, -chunkSize * 0.5, chunkSize * 0.5, 0, 1),
            remap(z, -chunkSize * 0.5, chunkSize * 0.5, 0, 1),
          ];

          const blade = generateBlade(pos, positions.length / 3, uv);
          blade.verts.forEach((vert) => {
            positions.push(...vert.pos);
            uvs.push(...vert.uv);
            colors.push(...vert.color);
          });
          blade.indices.forEach((indice) => indices.push(indice));
        }
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    geom.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(colors), 3)
    );
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, [terrainData]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        vertexColors: true,
        side: DoubleSide,
        transparent: true,
      }),
    [uniforms]
  );

  if (!terrainData) return null;

  const position: [number, number, number] = [
    offsetX - planeSize / 2,
    0,
    offsetZ - planeSize / 2,
  ];

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry!}
        material={material}
        position={position}
      />
    </>
  );
};
