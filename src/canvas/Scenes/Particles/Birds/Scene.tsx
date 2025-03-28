import { initComputeRenderer, useGpuCompute } from "@hooks/useGpuCompute";
import { extend, Object3DNode, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  fillPositionTexture,
  fillVelocityTexture,
} from "src/lib/utils/fillDataTexture";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  IUniform,
  Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
  ShaderMaterial,
  Vector3,
} from "three";
import CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import CustomShaderMaterial from "three-custom-shader-material";
import birdFragment from "./shaders/birds.frag";
import birdVertex from "./shaders/birds.vert";
import positionShader from "./shaders/position.frag";
import velocityShader from "./shaders/velocity.frag";
import { Variable } from "three-stdlib";

type Uniforms = { [uniform: string]: IUniform<any> };

export function Birds({ amount = 1000 }) {
  const textureWidth = Math.floor(Math.sqrt(amount));
  const bounds = 800;

  const gpuCompute = useGpuCompute(textureWidth);

  const velocityVariable = useRef<Variable>();
  const positionVariable = useRef<Variable>();
  const positionUniforms = useRef<Uniforms>();
  const velocityUniforms = useRef<Uniforms>();
  const birdUniforms = useMemo<Uniforms>(
    () => ({
      color: { value: new Color(0xff2200) },
      texturePosition: { value: null },
      textureVelocity: { value: null },
      time: { value: 1.0 },
      delta: { value: 0.0 },
    }),
    []
  );

  useEffect(() => {
    initComputeRenderer(
      gpuCompute,
      bounds,
      velocityShader,
      positionShader,
      positionVariable,
      velocityVariable,
      positionUniforms,
      velocityUniforms
    );

    function initBirds() {
      console.log("init birds");

      if (!birdMesh.current) return;

      birdMesh.current.rotation.y = Math.PI / 2;
      birdMesh.current.matrixAutoUpdate = false;
      birdMesh.current.updateMatrix();
    }

    initBirds();

    return () => gpuCompute && gpuCompute.dispose();
  }, [gpuCompute]);

  const birdGeometry = useMemo(() => {
    return new BirdGeometry(textureWidth);
  }, [textureWidth]);

  const mouseX = useRef(Infinity);
  const mouseY = useRef(Infinity);

  const { width, height } = useThree((state) => state.size);
  const windowHalfX = useMemo(() => width / 2, [width]);
  const windowHalfY = useMemo(() => height / 2, [height]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (event.isPrimary === false) return;

      mouseX.current = event.clientX - windowHalfX;
      mouseY.current = event.clientY - windowHalfY;
    }

    document.addEventListener("pointermove", onPointerMove);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, [windowHalfX, windowHalfY]);

  const last = useRef(performance.now());
  console.log({ windowHalfX, windowHalfY });
  console.log({ mouseX: mouseX.current, mouseY: mouseY.current });

  useFrame(() => {
    const now = performance.now();
    let delta = (now - last.current) / 1000;

    if (delta > 1) delta = 1;
    last.current = now;

    if (!positionUniforms.current || !velocityUniforms.current) return;

    positionUniforms.current["time"].value = now;
    positionUniforms.current["delta"].value = delta;
    velocityUniforms.current["time"].value = now;
    velocityUniforms.current["delta"].value = delta;
    birdMaterial.current.uniforms["time"].value = now;
    birdMaterial.current.uniforms["delta"].value = delta;

    velocityUniforms.current["predator"].value.set(
      (0.5 * mouseX.current) / windowHalfX,
      (-0.5 * mouseY.current) / windowHalfY,
      0
    );

    mouseX.current = Infinity;
    mouseY.current = Infinity;

    gpuCompute.compute();

    if (
      !birdMaterial.current ||
      !positionVariable.current ||
      !velocityVariable.current
    )
      return;

    // console.log("updating bird material uniforms");

    birdMaterial.current.uniforms["texturePosition"].value =
      gpuCompute.getCurrentRenderTarget(positionVariable.current).texture;

    birdMaterial.current.uniforms["textureVelocity"].value =
      gpuCompute.getCurrentRenderTarget(velocityVariable.current).texture;
  });

  const birdMesh = useRef<Mesh>(null!);
  const birdMaterial = useRef<CustomShaderMaterialType>(null!);

  return (
    <mesh ref={birdMesh} frustumCulled={false} geometry={birdGeometry}>
      <CustomShaderMaterial
        ref={birdMaterial}
        baseMaterial={MeshPhysicalMaterial}
        uniforms={birdUniforms}
        vertexShader={birdVertex}
        fragmentShader={birdFragment}
        side={DoubleSide}
        flatShading
      />
    </mesh>
  );
}

class BirdGeometry extends BufferGeometry {
  constructor(dataTextureWidth: number) {
    super();
    console.log("creating bird geometry");

    const numBirds = dataTextureWidth * dataTextureWidth;

    const trianglesPerBird = 3;
    const triangles = numBirds * trianglesPerBird;
    const points = triangles * 3;

    const vertices = new BufferAttribute(new Float32Array(points * 3), 3);
    const birdColors = new BufferAttribute(new Float32Array(points * 3), 3);
    const references = new BufferAttribute(new Float32Array(points * 2), 2);
    const birdVertex = new BufferAttribute(new Float32Array(points), 1);

    this.setAttribute("position", vertices);
    this.setAttribute("birdColor", birdColors);
    this.setAttribute("reference", references);
    this.setAttribute("birdVertex", birdVertex);

    let v = 0;

    function verts_push(...args: number[]) {
      for (let i = 0; i < args.length; i++) {
        vertices.array[v++] = args[i];
      }
    }

    const wingsSpan = 20;

    for (let f = 0; f < numBirds; f++) {
      verts_push(0, -0, -20, 0, 4, -20, 0, 0, 30);
      verts_push(0, 0, -15, -wingsSpan, 0, 0, 0, 0, 15);
      verts_push(0, 0, 15, wingsSpan, 0, 0, 0, 0, -15);
    }

    for (let v = 0; v < triangles * 3; v++) {
      const triangleIndex = ~~(v / 3);
      const birdIndex = ~~(triangleIndex / trianglesPerBird);
      const x = (birdIndex % dataTextureWidth) / dataTextureWidth;
      const y = ~~(birdIndex / dataTextureWidth) / dataTextureWidth;

      const c = new Color(0x444444 + (~~(v / 9) / numBirds) * 0x666666);
      birdColors.array[v * 3 + 0] = c.r;
      birdColors.array[v * 3 + 1] = c.g;
      birdColors.array[v * 3 + 2] = c.b;
      references.array[v * 2] = x;
      references.array[v * 2 + 1] = y;
      birdVertex.array[v] = v % 9;
    }

    this.scale(0.2, 0.2, 0.2);
  }
}
