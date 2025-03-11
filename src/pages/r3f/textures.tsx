import { ThreeFiberLayout } from "@components/dom/Layout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { OrbitControls, Plane, useTexture } from "@react-three/drei";
import { MeshStandardMaterialProps, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { ForwardedRef, forwardRef, Suspense, useEffect, useRef } from "react";
import { BufferAttribute, Mesh, Vector2 } from "three";

const SnowMaterial = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/Snow_001_COLOR.jpg",
      displacementMap: "/3d-assets/textures/Snow_001_DISP.png",
      normalMap: "/3d-assets/textures/Snow_001_NORM.jpg",
      roughnessMap: "/3d-assets/textures/Snow_001_ROUGH.jpg",
      aoMap: "/3d-assets/textures/Snow_001_OCC.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const ForestFloorMaterial1 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/forest_ground_01_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/forest_ground_01_disp_1k.jpg",
      normalMap: "/3d-assets/textures/forest_ground_01_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
      aoMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const ForestFloorMaterial2 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/forest_ground_04_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/forest_ground_04_disp_1k.jpg",
      normalMap: "/3d-assets/textures/forest_ground_04_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
      aoMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const ForestFloorMaterial3 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/forest_floor_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/forest_floor_disp_1k.jpg",
      normalMap: "/3d-assets/textures/forest_floor_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
      aoMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);
const BrownBarkMaterial = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/bark_brown_01_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/bark_brown_01_disp_1k.jpg",
      normalMap: "/3d-assets/textures/bark_brown_01_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
      aoMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const PineBarkMaterial = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/pine_bark_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/pine_bark_disp_1k.jpg",
      normalMap: "/3d-assets/textures/pine_bark_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
      aoMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const ForestLeavesMaterial1 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/forest_leaves_02_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/forest_leaves_02_disp_1k.jpg",
      normalMap: "/3d-assets/textures/forest_leaves_02_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
      aoMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const ForestLeavesMaterial2 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/forest_leaves_03_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/forest_leaves_03_disp_1k.jpg",
      normalMap: "/3d-assets/textures/forest_leaves_03_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
      aoMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const GrassRockMaterial = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/aerial_grass_rock_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/aerial_grass_rock_disp_1k.jpg",
      normalMap: "/3d-assets/textures/aerial_grass_rock_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
      aoMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const RocksGroundMaterial1 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/rocks_ground_01_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/rocks_ground_01_disp_1k.jpg",
      normalMap: "/3d-assets/textures/rocks_ground_01_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
      aoMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

const RocksGroundMaterial2 = forwardRef(
  (passedInProps: MeshStandardMaterialProps, ref: ForwardedRef<Mesh>) => {
    const props = useTexture({
      map: "/3d-assets/textures/rocks_ground_02_diff_1k.jpg",
      displacementMap: "/3d-assets/textures/rocks_ground_02_disp_1k.jpg",
      normalMap: "/3d-assets/textures/rocks_ground_02_nor_gl_1k.jpg",
      roughnessMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
      aoMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
      metalnessMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
    });
    return <meshStandardMaterial {...{ ...props, ...passedInProps }} />;
  }
);

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
    <>
      <ambientLight intensity={0.5} />
      <directionalLight />
      <Plane rotation-x={-Math.PI / 2} args={[10, 10, 1024, 1024]}>
        <SelectedMaterial
          ref={mesh}
          {...{
            displacementScale,
            aoMapIntensity,
            roughness,
            metalness,
            normalScale: new Vector2(normalScale[0], normalScale[1]),
          }}
        />
      </Plane>
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["#e2f3f9"]} />
        <Suspense fallback={null}>
          <Scene />
          <OrbitControls />
          {/* <Physics>
            <MinecraftCreativeController />
          </Physics> */}
        </Suspense>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
