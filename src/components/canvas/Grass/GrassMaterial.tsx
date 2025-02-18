import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import fragShader from "@shaders/grass/frag.glsl";
import vertShader from "@shaders/grass/vert.glsl";
import { Color, DoubleSide } from "three";

export const GrassMaterial = shaderMaterial(
  {
    bladeHeight: 1,
    map: null,
    alphaMap: null,
    time: 0,
    tipColor: new Color(0.0, 0.6, 0.0).convertSRGBToLinear(),
    bottomColor: new Color(0.0, 0.1, 0.0).convertSRGBToLinear(),
    // depthTest: true,
  },
  vertShader,
  fragShader,
  (self) => {
    if (!self) return;

    self.side = DoubleSide;
    self.depthTest = true;
  }
);

extend({ GrassMaterial });
