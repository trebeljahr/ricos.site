import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import {
  fillPositionTexture,
  fillVelocityTexture,
} from "src/lib/utils/fillDataTexture";
import { RepeatWrapping, Vector3 } from "three";
import { GPUComputationRenderer } from "three-stdlib";

export const useGpuCompute = (textureWidth: number) => {
  const { gl } = useThree();

  const gpuCompute = useMemo(() => {
    const gpuCompute = new GPUComputationRenderer(
      textureWidth,
      textureWidth,
      gl
    );
    const error = gpuCompute.init();

    if (error !== null) {
      console.error(error);
    }

    return gpuCompute;
  }, [gl, textureWidth]);

  return gpuCompute;
};

export function initComputeRenderer(
  gpuCompute: GPUComputationRenderer,
  bounds: number,
  velocityShader: string,
  positionShader: string,
  positionVariable: React.MutableRefObject<any>,
  velocityVariable: React.MutableRefObject<any>,
  positionUniforms: React.MutableRefObject<any>,
  velocityUniforms: React.MutableRefObject<any>
) {
  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();
  fillPositionTexture(dtPosition, bounds);
  fillVelocityTexture(dtVelocity);

  velocityVariable.current = gpuCompute.addVariable(
    "textureVelocity",
    velocityShader,
    dtVelocity
  );
  positionVariable.current = gpuCompute.addVariable(
    "texturePosition",
    positionShader,
    dtPosition
  );

  gpuCompute.setVariableDependencies(velocityVariable.current, [
    positionVariable.current,
    velocityVariable.current,
  ]);
  gpuCompute.setVariableDependencies(positionVariable.current, [
    positionVariable.current,
    velocityVariable.current,
  ]);

  positionUniforms.current = positionVariable.current.material.uniforms;
  velocityUniforms.current = velocityVariable.current.material.uniforms;

  positionUniforms.current["time"] = { value: 0.0 };
  positionUniforms.current["delta"] = { value: 0.0 };
  velocityUniforms.current["time"] = { value: 1.0 };
  velocityUniforms.current["delta"] = { value: 0.0 };
  velocityUniforms.current["testing"] = { value: 1.0 };
  velocityUniforms.current["separationDistance"] = { value: 1.0 };
  velocityUniforms.current["alignmentDistance"] = { value: 1.0 };
  velocityUniforms.current["cohesionDistance"] = { value: 1.0 };
  velocityUniforms.current["freedomFactor"] = { value: 1.0 };
  velocityUniforms.current["predator"] = { value: new Vector3(1, 1, 1) };
  velocityVariable.current.material.defines.BOUNDS = bounds.toFixed(2);

  velocityVariable.current.wrapS = RepeatWrapping;
  velocityVariable.current.wrapT = RepeatWrapping;
  positionVariable.current.wrapS = RepeatWrapping;
  positionVariable.current.wrapT = RepeatWrapping;

  const error = gpuCompute.init();

  if (error !== null) {
    console.error(error);
  }
}
