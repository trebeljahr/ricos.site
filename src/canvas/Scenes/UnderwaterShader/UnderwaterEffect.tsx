import { useThree } from "@react-three/fiber";
import fragmentShader from "@shaders/underwaterBackground.frag";
import { Effect, EffectAttribute } from "postprocessing";
import { useEffect, useMemo } from "react";
import {
  Color,
  Matrix4,
  type PerspectiveCamera,
  Uniform,
  Vector3,
  type WebGLRenderer,
} from "three";
import { evaluateWaveHeight, WATER_LEVEL, WATER_PRESETS } from "./waterPresets";

export interface UnderwaterEffectParams {
  absorption: [number, number, number];
  scatterShallow: string;
  scatterDeep: string;
  sunScatterColor: string;
  fogDensity: number;
  causticsIntensity: number;
  godRayIntensity: number;
  waveHeight: number;
  waveChoppiness: number;
  waterClarity: number;
  sunDirection: Vector3;
}

class UnderwaterEffectImpl extends Effect {
  public camera: PerspectiveCamera;
  private elapsed = 0;
  private wasUnderwater = false;
  private wetness = 0;

  private tempForward = new Vector3();
  private tempRight = new Vector3();
  private tempUp = new Vector3();
  private tempViewProj = new Matrix4();
  private tempViewMatrix = new Matrix4();

  constructor(camera: PerspectiveCamera) {
    const def = WATER_PRESETS.tropical;
    const sunDir = new Vector3(0.45, 0.74, 0.48).normalize();

    const uniforms: [string, Uniform][] = [
      ["cameraPos", new Uniform(new Vector3(0, 0, 0))],
      ["uCameraForward", new Uniform(new Vector3(0, 0, -1))],
      ["uCameraRight", new Uniform(new Vector3(1, 0, 0))],
      ["uCameraUp", new Uniform(new Vector3(0, 1, 0))],
      ["uTime", new Uniform(0.0)],
      ["uWaterLevel", new Uniform(WATER_LEVEL)],
      ["uSubmersion", new Uniform(0.0)],
      ["uWetness", new Uniform(0.0)],
      ["uCameraNear", new Uniform(camera.near)],
      ["uCameraFar", new Uniform(camera.far)],
      ["uFovTan", new Uniform(Math.tan((camera.fov * Math.PI) / 360))],
      ["uAspect", new Uniform(camera.aspect || 1.77)],
      ["uSunDir", new Uniform(sunDir)],
      ["uInvProjection", new Uniform(camera.projectionMatrixInverse.clone())],
      ["uInvView", new Uniform(camera.matrixWorld.clone())],
      ["uViewProjection", new Uniform(new Matrix4())],
      ["uAbsorption", new Uniform(new Vector3(...def.absorption))],
      ["uScatterShallow", new Uniform(new Color(def.scatterShallow))],
      ["uScatterDeep", new Uniform(new Color(def.scatterDeep))],
      ["uSunScatter", new Uniform(new Color(def.sunScatterColor))],
      ["uFogDensity", new Uniform(def.fogDensity)],
      ["uCausticsIntensity", new Uniform(def.causticsIntensity)],
      ["uGodRayIntensity", new Uniform(def.godRayIntensity)],
      ["uWaveHeight", new Uniform(def.waveHeight)],
      ["uWaveChoppiness", new Uniform(def.waveChoppiness)],
      ["uWaterClarity", new Uniform(def.waterClarity)],
    ];

    super("UnderwaterEffect", fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map(uniforms),
    });

    this.camera = camera;
  }

  public applyParams(params: UnderwaterEffectParams) {
    if (!this.uniforms) return;
    this.uniforms.get("uAbsorption")?.value.set(...params.absorption);
    this.uniforms.get("uScatterShallow")?.value.set(params.scatterShallow);
    this.uniforms.get("uScatterDeep")?.value.set(params.scatterDeep);
    this.uniforms.get("uSunScatter")?.value.set(params.sunScatterColor);

    const fogU = this.uniforms.get("uFogDensity");
    if (fogU) fogU.value = params.fogDensity;

    const caustU = this.uniforms.get("uCausticsIntensity");
    if (caustU) caustU.value = params.causticsIntensity;

    const raysU = this.uniforms.get("uGodRayIntensity");
    if (raysU) raysU.value = params.godRayIntensity;

    const waveHU = this.uniforms.get("uWaveHeight");
    if (waveHU) waveHU.value = params.waveHeight;

    const chopU = this.uniforms.get("uWaveChoppiness");
    if (chopU) chopU.value = params.waveChoppiness;

    const clarU = this.uniforms.get("uWaterClarity");
    if (clarU) clarU.value = params.waterClarity;

    this.uniforms.get("uSunDir")?.value.copy(params.sunDirection).normalize();
  }

  update(_renderer: WebGLRenderer, _inputBuffer: WebGLBuffer, deltaTime: number) {
    if (!this.uniforms) return;

    const dt = Math.min(deltaTime, 0.1);
    this.elapsed += dt;

    const uTime = this.uniforms.get("uTime");
    const cameraPosU = this.uniforms.get("cameraPos");
    const uCameraForward = this.uniforms.get("uCameraForward");
    const uCameraRight = this.uniforms.get("uCameraRight");
    const uCameraUp = this.uniforms.get("uCameraUp");
    const uSubmersion = this.uniforms.get("uSubmersion");
    const uWetness = this.uniforms.get("uWetness");
    const uCameraNear = this.uniforms.get("uCameraNear");
    const uCameraFar = this.uniforms.get("uCameraFar");
    const uFovTan = this.uniforms.get("uFovTan");
    const uAspect = this.uniforms.get("uAspect");
    const uInvProjection = this.uniforms.get("uInvProjection");
    const uInvView = this.uniforms.get("uInvView");
    const uViewProjection = this.uniforms.get("uViewProjection");
    const uWaveHeight = this.uniforms.get("uWaveHeight");
    const uWaveChoppiness = this.uniforms.get("uWaveChoppiness");

    if (
      !uTime ||
      !cameraPosU ||
      !uCameraForward ||
      !uCameraRight ||
      !uCameraUp ||
      !uSubmersion ||
      !uWetness ||
      !uCameraNear ||
      !uCameraFar ||
      !uFovTan ||
      !uAspect ||
      !uInvProjection ||
      !uInvView ||
      !uViewProjection
    ) {
      return;
    }

    uTime.value = this.elapsed;
    cameraPosU.value.copy(this.camera.position);

    this.camera.matrixWorld.extractBasis(this.tempRight, this.tempUp, this.tempForward);
    this.tempForward.negate().normalize();
    uCameraForward.value.copy(this.tempForward);
    uCameraRight.value.copy(this.tempRight);
    uCameraUp.value.copy(this.tempUp);

    uInvProjection.value.copy(this.camera.projectionMatrixInverse);
    uInvView.value.copy(this.camera.matrixWorld);

    this.tempViewMatrix.copy(this.camera.matrixWorldInverse);
    this.tempViewProj.multiplyMatrices(this.camera.projectionMatrix, this.tempViewMatrix);
    uViewProjection.value.copy(this.tempViewProj);

    uCameraNear.value = this.camera.near;
    uCameraFar.value = this.camera.far;
    uFovTan.value = Math.tan((this.camera.fov * Math.PI) / 360);
    uAspect.value = this.camera.aspect || 1.77;

    // Exact wave surface height at the camera's XZ
    const waveAmp = uWaveHeight ? (uWaveHeight.value as number) : 1.0;
    const waveChop = uWaveChoppiness ? (uWaveChoppiness.value as number) : 1.0;
    const localWaveY =
      WATER_LEVEL +
      evaluateWaveHeight(
        this.camera.position.x,
        this.camera.position.z,
        this.elapsed,
        waveAmp,
        waveChop,
      );

    const signedDistBelow = localWaveY - this.camera.position.y;
    const isNowUnderwater = signedDistBelow > 0;

    if (this.wasUnderwater && !isNowUnderwater) {
      // Camera breached from water into air: trigger lens wetness droplets
      this.wetness = 1.0;
    } else if (isNowUnderwater) {
      this.wetness = 1.0;
    } else {
      this.wetness = Math.max(0, this.wetness - dt * 0.42);
    }
    this.wasUnderwater = isNowUnderwater;

    uSubmersion.value = Math.max(0, Math.min(1, (signedDistBelow + 1.0) / 2.0));
    uWetness.value = this.wetness;
  }
}

export const UnderwaterEffect = ({ params }: { params: UnderwaterEffectParams }) => {
  const { camera } = useThree();
  const effect = useMemo(() => new UnderwaterEffectImpl(camera as PerspectiveCamera), [camera]);

  useEffect(() => {
    effect.applyParams(params);
  }, [effect, params]);

  return <primitive object={effect} />;
};
