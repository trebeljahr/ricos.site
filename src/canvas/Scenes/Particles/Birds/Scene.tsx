import { extend, Object3DNode, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  IUniform,
  Mesh,
  RepeatWrapping,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  GPUComputationRenderer,
  Variable,
} from "three/examples/jsm/misc/GPUComputationRenderer";
import positionShader from "./shaders/position.frag";
import velocityShader from "./shaders/velocity.frag";
import birdVertex from "./shaders/birds.vert";
import birdFragment from "./shaders/birds.frag";
import {
  fillPositionTexture,
  fillVelocityTexture,
} from "src/lib/utils/fillDataTexture";

const WIDTH = 100;
const BOUNDS = 800;
const BIRDS = WIDTH * WIDTH;

type Uniforms = { [uniform: string]: IUniform<any> };

export function Birds() {
  const { gl } = useThree();

  const gpuCompute = useMemo(() => {
    const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, gl);
    const error = gpuCompute.init();

    if (error !== null) {
      console.error(error);
    }

    return gpuCompute;
  }, [gl]);

  const velocityVariable = useRef<Variable>();
  const positionVariable = useRef<Variable>();
  const positionUniforms = useRef<Uniforms>();
  const velocityUniforms = useRef<Uniforms>();
  const birdUniforms = useRef<Uniforms>({
    color: { value: new Color(0xff2200) },
    texturePosition: { value: null },
    textureVelocity: { value: null },
    time: { value: 1.0 },
    delta: { value: 0.0 },
  });

  useEffect(() => {
    function initComputeRenderer() {
      const dtPosition = gpuCompute.createTexture();
      const dtVelocity = gpuCompute.createTexture();
      fillPositionTexture(dtPosition, BOUNDS);
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
      velocityVariable.current.material.defines.BOUNDS = BOUNDS.toFixed(2);

      velocityVariable.current.wrapS = RepeatWrapping;
      velocityVariable.current.wrapT = RepeatWrapping;
      positionVariable.current.wrapS = RepeatWrapping;
      positionVariable.current.wrapT = RepeatWrapping;

      const error = gpuCompute.init();

      if (error !== null) {
        console.error(error);
      }
    }

    initComputeRenderer();

    function initBirds() {
      birdUniforms.current = {
        color: { value: new Color(0xff2200) },
        texturePosition: { value: null },
        textureVelocity: { value: null },
        time: { value: 1.0 },
        delta: { value: 0.0 },
      };

      birdMesh.current.rotation.y = Math.PI / 2;
      birdMesh.current.matrixAutoUpdate = false;
      birdMesh.current.updateMatrix();
    }

    initBirds();

    return () => gpuCompute && gpuCompute.dispose();
  }, [gpuCompute]);

  const mouseX = useRef(10000);
  const mouseY = useRef(10000);

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
    birdUniforms.current["time"].value = now;
    birdUniforms.current["delta"].value = delta;

    velocityUniforms.current["predator"].value.set(
      (0.5 * mouseX.current) / windowHalfX,
      (-0.5 * mouseY.current) / windowHalfY,
      0
    );

    mouseX.current = 10000;
    mouseY.current = 10000;

    gpuCompute.compute();

    if (
      !birdMaterial.current ||
      !positionVariable.current ||
      !velocityVariable.current
    )
      return;

    birdMaterial.current.uniforms["texturePosition"].value =
      gpuCompute.getCurrentRenderTarget(positionVariable.current).texture;

    birdMaterial.current.uniforms["textureVelocity"].value =
      gpuCompute.getCurrentRenderTarget(velocityVariable.current).texture;
  });

  const birdMesh = useRef<Mesh<BirdGeometry, ShaderMaterial>>(null!);
  const birdMaterial = useRef<ShaderMaterial>(null!);

  return (
    <mesh ref={birdMesh}>
      <shaderMaterial
        ref={birdMaterial}
        uniforms={birdUniforms.current}
        vertexShader={birdVertex}
        fragmentShader={birdFragment}
        side={DoubleSide}
      />
      <birdGeometry />
    </mesh>
  );
}

class BirdGeometry extends BufferGeometry {
  constructor() {
    super();

    const trianglesPerBird = 3;
    const triangles = BIRDS * trianglesPerBird;
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

    for (let f = 0; f < BIRDS; f++) {
      verts_push(0, -0, -20, 0, 4, -20, 0, 0, 30);
      verts_push(0, 0, -15, -wingsSpan, 0, 0, 0, 0, 15);
      verts_push(0, 0, 15, wingsSpan, 0, 0, 0, 0, -15);
    }

    for (let v = 0; v < triangles * 3; v++) {
      const triangleIndex = ~~(v / 3);
      const birdIndex = ~~(triangleIndex / trianglesPerBird);
      const x = (birdIndex % WIDTH) / WIDTH;
      const y = ~~(birdIndex / WIDTH) / WIDTH;

      const c = new Color(0x444444 + (~~(v / 9) / BIRDS) * 0x666666);
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

extend({ BirdGeometry });

declare module "@react-three/fiber" {
  interface ThreeElements {
    birdGeometry: Object3DNode<BirdGeometry, typeof BirdGeometry>;
  }
}
