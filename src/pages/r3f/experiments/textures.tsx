import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { OrbitControls, Plane, Stage } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { Suspense, useEffect, useRef } from "react";
import {
  BrownBarkMaterial,
  ForestFloorMaterial1,
  ForestFloorMaterial2,
  ForestFloorMaterial3,
  ForestLeavesMaterial1,
  ForestLeavesMaterial2,
  GrassRockMaterial,
  PineBarkMaterial,
  RocksGroundMaterial1,
  RocksGroundMaterial2,
  SnowMaterial,
} from "src/Materials/TextureMaterials";
import { BufferAttribute, Mesh, Vector2 } from "three";

const Scene = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 20);
  }, [camera]);

  const {
    SelectedMaterial,
    displacementScale,
    aoMapIntensity,
    roughness,
    metalness,
    normalScale,
  } = useControls({
    displacementScale: {
      value: 0.5,
      min: 0,
      max: 1,
    },
    aoMapIntensity: {
      value: 1,
      min: 0,
      max: 1,
    },
    roughness: {
      value: 1,
      min: 0,
      max: 1,
    },
    metalness: {
      value: 0,
      min: 0,
      max: 1,
    },
    normalScale: [1, 1],
    SelectedMaterial: {
      options: {
        RocksGroundMaterial1: RocksGroundMaterial1,
        RocksGroundMaterial2: RocksGroundMaterial2,
        GrassRockMaterial: GrassRockMaterial,
        ForestLeavesMaterial1: ForestLeavesMaterial1,
        ForestLeavesMaterial2: ForestLeavesMaterial2,
        ForestFloorMaterial1: ForestFloorMaterial1,
        ForestFloorMaterial2: ForestFloorMaterial2,
        ForestFloorMaterial3: ForestFloorMaterial3,
        SnowMaterial: SnowMaterial,
        BrownBarkMaterial: BrownBarkMaterial,
        PineBarkMaterial: PineBarkMaterial,
      },
    },
  });

  const mesh = useRef<Mesh>(null!);

  useEffect(() => {
    mesh.current?.geometry.setAttribute(
      "uv2",
      new BufferAttribute(mesh.current.geometry.attributes.uv.array, 2)
    );
  }, []);

  return (
    <Stage adjustCamera>
      <ambientLight intensity={0.5} />
      <directionalLight />
      <Plane ref={mesh} rotation-x={-Math.PI / 2} args={[10, 10, 1024, 1024]}>
        <SelectedMaterial
          {...{
            displacementScale,
            aoMapIntensity,
            roughness,
            metalness,
            normalScale: new Vector2(normalScale[0], normalScale[1]),
          }}
        />
      </Plane>
    </Stage>
  );
};

const seoInfo = {
  title: "Demo of How to Use Textures",
  description:
    "In this demo you can control a bunch of textures with Leva sliders being applied to a simple plane.",
  url: "/r3f/experiments/textures",
  keywords: [
    "threejs",
    "react-three-fiber",

    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/textures.png",
  imageAlt: "a simple 3D plane with a rocky texture applied to it",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["#e2f3f9"]} />
        <Suspense fallback={null}>
          <Scene />
          <OrbitControls />
        </Suspense>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
