import { shaderMaterial } from "@react-three/drei";
import { ReactThreeFiber, useFrame } from "@react-three/fiber";
import fragmentShader from "@shaders/healthbar/healthbarFragShader.glsl";
import vertexShader from "@shaders/healthbar/healthbarVertShader.glsl";
import { RefObject, useEffect, useMemo, useRef } from "react";
import {
  Color,
  ColorRepresentation,
  DoubleSide,
  Material,
  Mesh,
  Vector2,
  Vector4,
} from "three";

// Shape enum
export const Shapes = {
  CIRCLE: 0,
  BOX: 1,
  RHOMBUS: 2,
};

const convertToVec4 = (color: Color) =>
  new Vector4(color.r, color.g, color.b, 1.0);

import { extend } from "@react-three/fiber";

declare module "@react-three/fiber" {
  interface ThreeElements {
    healthBarMaterial: ReactThreeFiber.Node<
      typeof HealthBarMaterial & Material,
      typeof HealthBarMaterial
    >;
  }
}

const uniforms = {
  time: 0,
  color: convertToVec4(new Color(0.2, 0.0, 0.1)),
  health: 1,
  fillColor: convertToVec4(new Color("#15ff00")),
  secondColo: convertToVec4(new Color("#15ff00")),
  bgColor: convertToVec4(new Color("#7f7e7e")),
  borderColor: convertToVec4(new Color("#2f2f2f")),
  borderWidth: 0.05,
  waveAmp: 0.01,
  waveFreq: 8,
  waveSpeed: 0.3,
  animationSpeed: 0.01,
  minHealth: 0,
  maxHealth: 1,
  size: new Vector2(0, 0),
  shape: Shapes.RHOMBUS,
};

const HealthBarMaterial = shaderMaterial(
  uniforms,
  vertexShader,
  fragmentShader,

  (self) => {
    if (!self) return;

    self.transparent = true;
    self.side = DoubleSide;
  }
);

extend({ HealthBarMaterial });

export const GenericHealthBar = ({
  health,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  lowHealthThreshold = 0.2,
  fillColor = "#15ff00",
  secondColor,
  bgColor = "#7f7e7e",
  borderColor = "#2f2f2f",
  borderWidth = 0.05,
  waveAmp = 0.01,
  waveFreq = 8,
  waveSpeed = 0.3,
  shape,
  animationSpeed = 0.01,
  minHealth = 0,
  maxHealth = 1,
}: {
  health: RefObject<number>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  lowHealthThreshold?: number;
  fillColor?: ColorRepresentation;
  secondColor?: ColorRepresentation;
  bgColor?: ColorRepresentation;
  borderColor?: ColorRepresentation;
  borderWidth?: number;
  waveAmp?: number;
  waveFreq?: number;
  waveSpeed?: number;
  shape?: number;
  animationSpeed?: number;
  minHealth?: number;
  maxHealth?: number;
}) => {
  const meshRef = useRef<Mesh>(null!);
  const materialRef = useRef<typeof HealthBarMaterial & typeof uniforms>(null!);

  const sizeVec = useMemo(() => new Vector2(scale[0], scale[2]), [scale]);

  useFrame((state) => {
    if (!materialRef.current || health.current === null) return;

    materialRef.current.time = state.clock.getElapsedTime();
    materialRef.current.health = health.current;

    materialRef.current.size = sizeVec;
    materialRef.current.minHealth = minHealth;
    materialRef.current.maxHealth = maxHealth;
    materialRef.current.shape = shape === undefined ? Shapes.RHOMBUS : shape;
    materialRef.current.waveAmp = waveAmp;
    materialRef.current.waveFreq = waveFreq;
    materialRef.current.waveSpeed = waveSpeed;
    materialRef.current.borderWidth = borderWidth;
    materialRef.current.animationSpeed = animationSpeed;
    materialRef.current.fillColor = convertToVec4(new Color(fillColor));
    materialRef.current.bgColor = convertToVec4(new Color(bgColor));
    materialRef.current.borderColor = convertToVec4(new Color(borderColor));

    if (secondColor) {
      const blendColor = new Color(fillColor).lerp(
        new Color(secondColor),
        health.current
      );

      materialRef.current.fillColor = convertToVec4(blendColor);
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[scale[0], scale[2], 1, 1]} />
      <healthBarMaterial ref={materialRef as any} key={HealthBarMaterial.key} />
    </mesh>
  );
};
