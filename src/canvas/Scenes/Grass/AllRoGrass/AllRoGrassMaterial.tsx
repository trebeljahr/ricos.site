import { shaderMaterial } from "@react-three/drei";
import { extend, ReactThreeFiber } from "@react-three/fiber";
import fragShader from "@shaders/grass/frag.glsl";
import vertShader from "@shaders/grass/vert.glsl";
import { Color, DoubleSide, Material, ShaderMaterial, Texture } from "three";

const uniforms = {
  map: null as Texture | null,
  alphaMap: null as Texture | null,
  time: 0,
  tipColor: new Color(0.0, 0.6, 0.0).convertSRGBToLinear(),
  bottomColor: new Color(0.0, 0.1, 0.0).convertSRGBToLinear(),
  bladeHeight: 0.02,
  bladeWidth: 0.02 / 8,
  joints: 5,
};

export type GrassMaterialType = typeof GrassMaterial &
  Material &
  ShaderMaterial &
  typeof uniforms;

declare module "@react-three/fiber" {
  interface ThreeElements {
    grassMaterial: ReactThreeFiber.Node<
      GrassMaterialType,
      typeof GrassMaterial
    >;
  }
}

export const GrassMaterial = shaderMaterial(
  uniforms,
  vertShader,
  fragShader,
  (self) => {
    if (!self) return;

    self.side = DoubleSide;
    self.depthTest = true;
    self.depthWrite = true;
    self.transparent = false;
  }
);

extend({ GrassMaterial });
