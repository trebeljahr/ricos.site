import { shaderMaterial } from "@react-three/drei";
import { extend, ReactThreeFiber } from "@react-three/fiber";
import { DoubleSide, Material, Texture } from "three";
import grassFragmentShader from "./shaders/grassFragmentShader.glsl";
import grassVertexShader from "./shaders/grassVertexShader.glsl";

export const grassUniforms = {
  textures: [] as Texture[],
  iTime: 0,
};

export const StylizedGrassMaterial = shaderMaterial(
  grassUniforms,
  grassVertexShader,
  grassFragmentShader,

  (self) => {
    if (!self) return;

    self.vertexColors = true;
    self.depthTest = true;
    self.depthWrite = true;

    self.transparent = false;
    self.side = DoubleSide;
  }
);

extend({ StylizedGrassMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    stylizedGrassMaterial: ReactThreeFiber.Node<
      typeof StylizedGrassMaterial & Material,
      typeof StylizedGrassMaterial
    >;
  }
}
