import { useTexture } from "@react-three/drei";
import { MeshStandardMaterialProps } from "@react-three/fiber";
import { RepeatWrapping } from "three";

export const SnowMaterial = (passedInProps: MeshStandardMaterialProps) => {
  const textures = useTexture({
    map: "/3d-assets/textures/Snow_001_COLOR.jpg",
    displacementMap: "/3d-assets/textures/Snow_001_DISP.png",
    normalMap: "/3d-assets/textures/Snow_001_NORM.jpg",
    roughnessMap: "/3d-assets/textures/Snow_001_ROUGH.jpg",
    aoMap: "/3d-assets/textures/Snow_001_OCC.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return (
    <meshStandardMaterial
      {...{ ...textures, ...passedInProps }}
      attach="material"
    />
  );
};

export const ForestFloorMaterial1 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/forest_ground_01_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/forest_ground_01_disp_1k.jpg",
    normalMap: "/3d-assets/textures/forest_ground_01_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
    aoMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/forest_ground_01_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const ForestFloorMaterial2 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/forest_ground_04_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/forest_ground_04_disp_1k.jpg",
    normalMap: "/3d-assets/textures/forest_ground_04_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
    aoMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/forest_ground_04_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const ForestFloorMaterial3 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/forest_floor_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/forest_floor_disp_1k.jpg",
    normalMap: "/3d-assets/textures/forest_floor_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
    aoMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/forest_floor_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const BrownBarkMaterial = (passedInProps: MeshStandardMaterialProps) => {
  const textures = useTexture({
    map: "/3d-assets/textures/bark_brown_01_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/bark_brown_01_disp_1k.jpg",
    normalMap: "/3d-assets/textures/bark_brown_01_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
    aoMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/bark_brown_01_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const PineBarkMaterial = (passedInProps: MeshStandardMaterialProps) => {
  const textures = useTexture({
    map: "/3d-assets/textures/pine_bark_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/pine_bark_disp_1k.jpg",
    normalMap: "/3d-assets/textures/pine_bark_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
    aoMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/pine_bark_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const ForestLeavesMaterial1 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/forest_leaves_02_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/forest_leaves_02_disp_1k.jpg",
    normalMap: "/3d-assets/textures/forest_leaves_02_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
    aoMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/forest_leaves_02_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const ForestLeavesMaterial2 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/forest_leaves_03_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/forest_leaves_03_disp_1k.jpg",
    normalMap: "/3d-assets/textures/forest_leaves_03_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
    aoMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/forest_leaves_03_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const GrassRockMaterial = (passedInProps: MeshStandardMaterialProps) => {
  const textures = useTexture({
    map: "/3d-assets/textures/aerial_grass_rock_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/aerial_grass_rock_disp_1k.jpg",
    normalMap: "/3d-assets/textures/aerial_grass_rock_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
    aoMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/aerial_grass_rock_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const RocksGroundMaterial1 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/rocks_ground_01_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/rocks_ground_01_disp_1k.jpg",
    normalMap: "/3d-assets/textures/rocks_ground_01_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
    aoMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/rocks_ground_01_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};

export const RocksGroundMaterial2 = (
  passedInProps: MeshStandardMaterialProps
) => {
  const textures = useTexture({
    map: "/3d-assets/textures/rocks_ground_02_diff_1k.jpg",
    displacementMap: "/3d-assets/textures/rocks_ground_02_disp_1k.jpg",
    normalMap: "/3d-assets/textures/rocks_ground_02_nor_gl_1k.jpg",
    roughnessMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
    aoMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
    metalnessMap: "/3d-assets/textures/rocks_ground_02_arm_1k.jpg",
  });

  Object.values(textures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  return <meshStandardMaterial {...{ ...textures, ...passedInProps }} />;
};
