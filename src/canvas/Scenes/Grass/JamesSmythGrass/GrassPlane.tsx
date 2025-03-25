import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  grassUniforms,
  StylizedGrassMaterial,
} from "./JamesSmythGrassMaterial";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, DoubleSide, Vector3 } from "three";
import { blackPlaneMaterial } from "../BlackPlaneMaterial";

export const SingleStylizedGrassPlane = ({
  planeSize = 30,
  bladeCount = 100000,
  bladeWidth = 0.1,
  bladeHeight = 0.8,
  bladeHeightVariation = 0.6,
}: {
  planeSize?: number;
  bladeCount?: number;
  bladeWidth?: number;
  bladeHeight?: number;
  bladeHeightVariation?: number;
}) => {
  const grassTexture = useTexture("/3d-assets/grass/grass.jpg");
  const cloudTexture = useTexture("/3d-assets/grass/cloud.jpg");

  const materialRef = useRef<
    typeof StylizedGrassMaterial & typeof grassUniforms
  >(null!);

  useEffect(() => {
    materialRef.current.textures = [grassTexture, cloudTexture];
  }, []);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    materialRef.current.iTime = elapsedTime * 1000;
  });

  const geom = useMemo(() => {
    function convertRange(
      val: number,
      oldMin: number,
      oldMax: number,
      newMin: number,
      newMax: number
    ) {
      return ((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;
    }

    function generateField() {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const colors: number[] = [];

      for (let i = 0; i < bladeCount; i++) {
        const VERTEX_COUNT = 5;
        const surfaceMin = (planeSize / 2) * -1;
        const surfaceMax = planeSize / 2;
        const radius = planeSize / 2;

        const r = radius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);

        const pos = new Vector3(x, 0, y);

        const uv: [number, number] = [
          convertRange(pos.x, surfaceMin, surfaceMax, 0, 1),
          convertRange(pos.z, surfaceMin, surfaceMax, 0, 1),
        ];

        const blade = generateBlade(pos, i * VERTEX_COUNT, uv);
        blade.verts.forEach((vert) => {
          positions.push(...vert.pos);
          uvs.push(...vert.uv);
          colors.push(...vert.color);
        });
        blade.indices.forEach((indice) => indices.push(indice));
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
    }

    function generateBlade(
      center: Vector3,
      vArrOffset: number,
      uv: [number, number]
    ) {
      const MID_WIDTH = bladeWidth * 0.5;
      const TIP_OFFSET = 0.1;
      const height = bladeHeight + Math.random() * bladeHeightVariation;

      const yaw = Math.random() * Math.PI * 2;
      const yawUnitVec = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
      const tipBend = Math.random() * Math.PI * 2;
      const tipBendUnitVec = new Vector3(
        Math.sin(tipBend),
        0,
        -Math.cos(tipBend)
      );

      const bl = new Vector3().addVectors(
        center,
        new Vector3().copy(yawUnitVec).multiplyScalar((bladeWidth / 2) * 1)
      );
      const br = new Vector3().addVectors(
        center,
        new Vector3().copy(yawUnitVec).multiplyScalar((bladeWidth / 2) * -1)
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

    const geometry = generateField();

    return geometry;
  }, []);

  return (
    <>
      <mesh geometry={geom} renderOrder={10} frustumCulled={false}>
        <stylizedGrassMaterial
          ref={materialRef as any}
          key={StylizedGrassMaterial.key}
          transparent={true}
          depthTest={true}
          depthWrite={true}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} material={blackPlaneMaterial}>
        <planeGeometry args={[planeSize, planeSize]} />
      </mesh>
    </>
  );
};
