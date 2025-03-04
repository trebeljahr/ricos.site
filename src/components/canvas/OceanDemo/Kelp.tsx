import { useKelp } from "@models/Kelp4";
import { useFrame, useThree } from "@react-three/fiber";
import kelpVert from "@shaders/kelp.vert";
import kelpFrag from "@shaders/kelp.frag";

import FastPoissonDiskSampling from "fast-2d-poisson-disk-sampling";
import { memo, useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import { randFloat } from "three/src/math/MathUtils";
import { scale } from "./Terrain";

export function CustomKelpShaderMaterial() {
  const materialRef = useRef<CustomShaderMaterialType>();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(
    () => ({
      uTime: {
        value: 0,
      },
    }),
    []
  );

  return (
    <CustomShaderMaterial
      ref={materialRef}
      baseMaterial={MeshPhysicalMaterial}
      vertexShader={kelpVert}
      fragmentShader={kelpFrag}
      uniforms={uniforms}
      flatShading
      color={"#4CBB17"}
    />
  );
}

export const SingleKelpTile = memo<{ offset?: Vector2 }>(
  function SingleKelpTile({ offset = new Vector2(0, 0) }) {
    const ref = useRef<InstancedMesh<BufferGeometry, ShaderMaterial>>(null!);

    const result = useKelp();
    const { geometry } = result;

    const kelpGeometry = geometry;

    const points = useMemo(() => {
      const sampler = new FastPoissonDiskSampling({
        shape: [scale, scale],
        radius: 10,
        tries: 5,
      });
      const points = sampler.fill() as [number, number][];

      return points;
    }, []);

    useEffect(() => {
      if (!ref.current) return;

      points.forEach(([px, pz], i) => {
        const [x, z] = [px - scale / 2 + offset.x, pz - scale / 2 + offset.y];

        const temp = new Object3D();

        const localScale = randFloat(0.02, 0.03) * 5;
        temp.position.set(x, 0, z);
        temp.rotation.set(0, 0, 0);
        temp.scale.set(localScale, localScale, localScale);

        temp.updateMatrix();

        ref.current.setMatrixAt(i, temp.matrix);
      });

      ref.current.instanceMatrix.setUsage(DynamicDrawUsage);
      ref.current.instanceMatrix.needsUpdate = true;
    }, [offset, points]);

    return (
      <instancedMesh ref={ref} args={[kelpGeometry, undefined, points.length]}>
        <CustomKelpShaderMaterial />
      </instancedMesh>
    );
  }
);
