import { useThree } from "@react-three/fiber";
import fragmentShader from "@shaders/sampleDepthBuffer.frag";
import { Effect, EffectAttribute } from "postprocessing";
import { useMemo } from "react";
import {
  PerspectiveCamera,
  Uniform,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { farOverwater, farUnderwater, surfaceLevel } from "./Scene";

class UnderwaterFogEffectImpl extends Effect {
  public camera: PerspectiveCamera;
  constructor(camera: PerspectiveCamera) {
    super("UnderwaterFogEffect", fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ["cameraPos", new Uniform(new Vector3(0, 0, 0))],
        ["cameraLookAt", new Uniform(new Vector3(1, 0, 1))],
        ["uTime", new Uniform(0.0)],
      ]),
    });
    this.camera = camera;
  }

  update(renderer: WebGLRenderer, inputBuffer: WebGLBuffer, deltaTime: number) {
    if (!this.uniforms) return;

    const uTime = this.uniforms.get("uTime");
    const cameraPos = this.uniforms.get("cameraPos");
    if (!uTime || !cameraPos) return;

    uTime.value += deltaTime;
    cameraPos.value = this.camera.position;

    if (
      this.camera.position.y > surfaceLevel &&
      this.camera.far === farUnderwater
    ) {
      this.camera.far = farOverwater;
      this.camera.updateProjectionMatrix();
    } else if (
      this.camera.position.y < surfaceLevel &&
      this.camera.far === farOverwater
    ) {
      this.camera.far = farUnderwater;
      this.camera.updateProjectionMatrix();
    }

    let lookAtVector = new Vector3(0, 0, -1);
    lookAtVector.applyQuaternion(this.camera.quaternion);
    const lookAt = this.uniforms.get("cameraLookAt");
    if (!lookAt) return;

    lookAt.value = lookAtVector;
  }
}

export const UnderwaterFogEffect = () => {
  const { camera } = useThree();
  const effect = useMemo(
    () => new UnderwaterFogEffectImpl(camera as PerspectiveCamera),
    [camera]
  );
  return <primitive object={effect} />;
};
