import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import fragmentShader from "@shaders/healthbar/healthbarFragShader.glsl";
import vertexShader from "@shaders/healthbar/healthbarVertShader.glsl";
import { RefObject, useMemo, useRef } from "react";
import {
  Color,
  ColorRepresentation,
  DoubleSide,
  MathUtils,
  Mesh,
  ShaderMaterial,
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

export const HealthBar = ({
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
  const materialRef = useRef<ShaderMaterial>(null!);

  const fillColorVec = useMemo(
    () => convertToVec4(new Color(fillColor)),
    [fillColor]
  );
  const backgroundColorVec = useMemo(
    () => convertToVec4(new Color(bgColor)),
    [bgColor]
  );
  const borderColorVec = useMemo(
    () => convertToVec4(new Color(borderColor)),
    [borderColor]
  );

  const sizeVec = useMemo(() => new Vector2(scale[0], scale[2]), [scale]);

  const uniforms = {
    health: { value: health.current },
    lowHealthThreshold: { value: lowHealthThreshold },
    fillColor: { value: fillColorVec },
    backgroundColor: { value: backgroundColorVec },
    borderColor: {
      value: borderColorVec,
    },
    borderWidth: { value: borderWidth },
    waveAmp: { value: waveAmp },
    waveFreq: { value: waveFreq },
    waveSpeed: { value: waveSpeed },
    time: { value: 0 },
    size: { value: sizeVec },
    shape: { value: shape },
  };

  useFrame((state) => {
    if (!materialRef.current || !health.current) return;

    materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    materialRef.current.uniforms.health.value = health.current;

    if (secondColor) {
      const blendColor = new Color(fillColor).lerp(
        new Color(secondColor),
        health.current
      );

      materialRef.current.uniforms.fillColor = {
        value: convertToVec4(blendColor),
      };
    }
  });

  return (
    // <Plane
    //   ref={meshRef}
    //   args={[scale[0], scale[2]]}
    //   position={position}
    //   rotation={rotation}
    // >
    //   <shaderMaterial
    //     ref={materialRef}
    //     vertexShader={vertexShader}
    //     fragmentShader={fragmentShader}
    //     uniforms={uniforms}
    //     transparent={true}
    //     side={DoubleSide}
    //   />
    // </Plane>
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[scale[0], scale[2], 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={DoubleSide}
      />
    </mesh>
  );
};
