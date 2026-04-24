import { useThree } from "@react-three/fiber";
import fragmentShader from "@shaders/underwaterBackground.frag";
import { Effect, EffectAttribute } from "postprocessing";
import { useMemo } from "react";
import { type PerspectiveCamera, Uniform, Vector3, type WebGLRenderer } from "three";

const WATER_LEVEL = 45;
const FAR_OVERWATER = 500;
const FAR_UNDERWATER = 250;
const SUBMERSION_BAND = 6.0;

class UnderwaterEffectImpl extends Effect {
  public camera: PerspectiveCamera;
  private elapsed = 0;
  private currentFar: number = FAR_OVERWATER;

  constructor(camera: PerspectiveCamera) {
    const sunDir = new Vector3(0.5, 0.7, 0.3).normalize();

    const uniforms: [string, Uniform][] = [
      ["cameraPos", new Uniform(new Vector3(0, 0, 0))],
      ["cameraLookAt", new Uniform(new Vector3(0, 0, -1))],
      ["uTime", new Uniform(0.0)],
      ["uWaterLevel", new Uniform(WATER_LEVEL)],
      ["uSubmersion", new Uniform(0.0)],
      ["uCameraNear", new Uniform(camera.near)],
      ["uCameraFar", new Uniform(camera.far)],
      ["uSunDir", new Uniform(sunDir)],
      ["uInvProjection", new Uniform(camera.projectionMatrixInverse.clone())],
      ["uInvView", new Uniform(camera.matrixWorld.clone())],
    ];

    super("UnderwaterEffect", fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map(uniforms),
    });

    this.camera = camera;
    this.currentFar = camera.far;
  }

  update(_renderer: WebGLRenderer, _inputBuffer: WebGLBuffer, deltaTime: number) {
    if (!this.uniforms) return;

    this.elapsed += deltaTime;

    const uTime = this.uniforms.get("uTime");
    const cameraPosU = this.uniforms.get("cameraPos");
    const cameraLookAtU = this.uniforms.get("cameraLookAt");
    const uSubmersion = this.uniforms.get("uSubmersion");
    const uCameraNear = this.uniforms.get("uCameraNear");
    const uCameraFar = this.uniforms.get("uCameraFar");
    const uInvProjection = this.uniforms.get("uInvProjection");
    const uInvView = this.uniforms.get("uInvView");

    if (
      !uTime ||
      !cameraPosU ||
      !cameraLookAtU ||
      !uSubmersion ||
      !uCameraNear ||
      !uCameraFar ||
      !uInvProjection ||
      !uInvView
    )
      return;

    uTime.value = this.elapsed;
    cameraPosU.value.copy(this.camera.position);

    // Inverse matrices for world position reconstruction
    uInvProjection.value.copy(this.camera.projectionMatrixInverse);
    uInvView.value.copy(this.camera.matrixWorld);

    // Smooth submersion
    const dist = WATER_LEVEL - this.camera.position.y;
    const submersion = Math.max(0, Math.min(1, (dist + SUBMERSION_BAND * 0.5) / SUBMERSION_BAND));
    uSubmersion.value = submersion;

    // Lerp camera far plane
    const targetFar = FAR_OVERWATER + (FAR_UNDERWATER - FAR_OVERWATER) * submersion;
    this.currentFar += (targetFar - this.currentFar) * Math.min(1, deltaTime * 3);

    if (Math.abs(this.camera.far - this.currentFar) > 0.5) {
      this.camera.far = this.currentFar;
      this.camera.updateProjectionMatrix();
    }

    uCameraNear.value = this.camera.near;
    uCameraFar.value = this.camera.far;

    // Look direction
    const lookAt = new Vector3(0, 0, -1);
    lookAt.applyQuaternion(this.camera.quaternion);
    cameraLookAtU.value.copy(lookAt);
  }
}

export const UnderwaterEffect = () => {
  const { camera } = useThree();
  const effect = useMemo(() => new UnderwaterEffectImpl(camera as PerspectiveCamera), [camera]);
  return <primitive object={effect} />;
};
