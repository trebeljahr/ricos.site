import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import fragShader from "@shaders/grass/frag.glsl";
import vertShader from "@shaders/grass/vert.glsl";
import * as THREE from "three";

export const GrassMaterial = shaderMaterial(
  {
    bladeHeight: 1,
    map: null,
    alphaMap: null,
    time: 0,
    tipColor: new THREE.Color(0.0, 0.6, 0.0).convertSRGBToLinear(),
    bottomColor: new THREE.Color(0.0, 0.1, 0.0).convertSRGBToLinear(),
  },
  vertShader,
  fragShader,
  (self) => {
    if (!self) return;

    self.side = THREE.DoubleSide;
  }
);

extend({ GrassMaterial });
