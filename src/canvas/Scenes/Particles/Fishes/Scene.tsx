/* eslint-disable react-hooks/rules-of-hooks */
// import { useFBO } from '@react-three/drei'
import { initComputeRenderer, useGpuCompute } from "@hooks/useGpuCompute";
import { useDolphin } from "@r3f/AllModels/fish_pack/Dolphin";
import { useFish1 } from "@r3f/AllModels/fish_pack/Fish1";
import { useFish2 } from "@r3f/AllModels/fish_pack/Fish2";
import { useFish3 } from "@r3f/AllModels/fish_pack/Fish3";
import { useMantaRay } from "@r3f/AllModels/fish_pack/Ray";
import { useShark } from "@r3f/AllModels/fish_pack/Shark";
import { useWhale } from "@r3f/AllModels/fish_pack/Whale";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  IUniform,
  Mesh,
  MeshPhysicalMaterial,
  ShaderMaterial,
  SkinnedMesh,
  Vector3,
} from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import { mergeBufferGeometries, Variable } from "three-stdlib";
import fishFragment from "./shaders/fishFrag.glsl";
import fishVertex from "./shaders/fishVert.glsl";
import positionShader from "./shaders/positionFrag.glsl";
import velocityShader from "./shaders/velocityFrag.glsl";

export enum FishType {
  BlueTang,
  DoctorFish,
  ClownFish,
  Dolphin,
  Whale,
  Shark,
  Manta,
}

type Uniforms = { [key: string]: IUniform<any> };

export function Fishes({
  amount = 100,
  fishType = FishType.DoctorFish,
  position = new Vector3(0, 0, 0),
  color = "#FF7F50",
  scaleFactor = 0.1,
}) {
  const fishTextureWidth = Math.floor(Math.sqrt(amount));
  const bounds = 10;

  const gpuCompute = useGpuCompute(fishTextureWidth);

  const velocityVariable = useRef<Variable>(null!);
  const positionVariable = useRef<Variable>(null!);
  const positionUniforms = useRef<Uniforms>(null!);
  const velocityUniforms = useRef<Uniforms>(null!);

  const fishUniforms = useMemo<Uniforms>(
    () => ({
      color: { value: new Color(color) },
      texturePosition: { value: null },
      textureVelocity: { value: null },
      time: { value: 1.0 },
      scaleFactor: { value: scaleFactor },
      delta: { value: 0.0 },
      minX: { value: 0.0 },
      maxX: { value: 0.0 },
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

    function initFishs() {
      console.log("init fishs");
      if (!fishMesh.current) return;

      fishMesh.current.rotation.y = Math.PI / 2;
      fishMesh.current.matrixAutoUpdate = false;
      fishMesh.current.updateMatrix();
    }

    initFishs();

    return () => gpuCompute && gpuCompute.dispose();
  }, [gpuCompute]);

  const last = useRef(performance.now());

  useFrame(() => {
    if (!velocityVariable.current || !positionVariable.current) return;

    const now = performance.now();
    let delta = (now - last.current) / 1000;

    if (delta > 1) delta = 1;
    last.current = now;

    if (
      !fishMaterial.current ||
      !positionUniforms.current ||
      !velocityUniforms.current
    )
      return;

    positionUniforms.current["time"].value = now;
    positionUniforms.current["delta"].value = delta;

    velocityUniforms.current["time"].value = now;
    velocityUniforms.current["delta"].value = delta;

    fishMaterial.current.uniforms["time"].value = now;
    fishMaterial.current.uniforms["delta"].value = delta;
    fishMaterial.current.uniforms.minX.value = minX;
    fishMaterial.current.uniforms.maxX.value = maxX;

    gpuCompute.compute();

    const posValue = gpuCompute.getCurrentRenderTarget(
      positionVariable.current
    ).texture;
    fishMaterial.current.uniforms["texturePosition"].value = posValue;

    const velValue = gpuCompute.getCurrentRenderTarget(
      velocityVariable.current
    ).texture;
    fishMaterial.current.uniforms["textureVelocity"].value = velValue;
  });

  const fishMesh = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null!);
  const fishMaterial = useRef<CustomShaderMaterialType>(null!);

  const fishGeometryArray = useFishGeos(fishType);

  const { fishGeo, minX, maxX } = useMemo(() => {
    const merged = mergeBufferGeometries([...fishGeometryArray]);
    const fishGeo = merged as BufferGeometry;

    const scale = 50 / scaleFactor;
    fishGeo.scale(scale, scale, scale);

    fishGeo.rotateX(-Math.PI / 2);
    let currentMin = Infinity;
    let currentMax = -Infinity;
    for (let i = 0; i < fishGeo.attributes.position.array.length; i += 3) {
      const x = fishGeo.attributes.position.array[i + 2];
      currentMin = Math.min(currentMin, x);
      currentMax = Math.max(currentMax, x);
    }

    return { fishGeo, minX: currentMin, maxX: currentMax };
  }, [fishGeometryArray]);

  const customFishGeometry = useMemo(() => {
    const allFishes = new BufferGeometry();

    const totalVertices = fishGeo.getAttribute("position").count * 3 * amount;

    const vertices = [];
    const reference = [];
    const indices = [];
    const normals = [];

    for (let i = 0; i < totalVertices; i++) {
      const fishIndex = i % (fishGeo.getAttribute("position").count * 3);
      vertices.push(fishGeo.getAttribute("position").array[fishIndex]);
      normals.push(fishGeo.getAttribute("normal").array[fishIndex]);
    }

    let r = Math.random();
    for (let i = 0; i < fishGeo.getAttribute("position").count * amount; i++) {
      const fishIndex = i % fishGeo.getAttribute("position").count;
      const fish = Math.floor(i / fishGeo.getAttribute("position").count);
      if (fishIndex === 0) r = Math.random();
      const j = ~~fish;
      const x = (j % fishTextureWidth) / fishTextureWidth;
      const y = ~~(j / fishTextureWidth) / fishTextureWidth;
      reference.push(x, y);
    }

    const length = fishGeo?.index?.array.length;
    const fishGeoArray = fishGeo?.index?.array;

    if (length === undefined || !fishGeoArray) return allFishes;

    for (let i = 0; i < length * amount; i++) {
      const offset =
        Math.floor(i / length) * fishGeo.getAttribute("position").count;
      indices.push(fishGeoArray[i % length] + offset);
    }

    allFishes.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices), 3)
    );
    allFishes.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), 3)
    );
    allFishes.setAttribute(
      "reference",
      new BufferAttribute(new Float32Array(reference), 2)
    );

    allFishes.setIndex(indices);

    return allFishes;
  }, [fishGeo, amount, fishTextureWidth]);

  return (
    <group position={position} scale={scaleFactor}>
      <mesh ref={fishMesh} geometry={customFishGeometry} frustumCulled={false}>
        <CustomShaderMaterial
          ref={fishMaterial}
          baseMaterial={MeshPhysicalMaterial}
          vertexShader={fishVertex}
          fragmentShader={fishFragment}
          uniforms={fishUniforms}
          flatShading
        />
      </mesh>
    </group>
  );
}

function useFishGeo(typeOfFish: FishType) {
  switch (typeOfFish) {
    case FishType.BlueTang:
      return useFish1();
    case FishType.DoctorFish:
      return useFish2();
    case FishType.ClownFish:
      return useFish3();
    case FishType.Whale:
      return useWhale();
    case FishType.Dolphin:
      return useDolphin();
    case FishType.Shark:
      return useShark();
    case FishType.Manta:
      return useMantaRay();
  }
}

function useFishGeos(typeOfFish: FishType) {
  const { nodes } = useFishGeo(typeOfFish);

  const typedNodes = nodes as Record<string, SkinnedMesh | Bone>;

  const fishGeos: BufferGeometry[] = Object.keys(nodes).reduce((agg, key) => {
    if (!(typedNodes[key] instanceof SkinnedMesh)) return agg;

    return [...agg, typedNodes[key].geometry];
  }, [] as BufferGeometry[]);

  return fishGeos;
}
