import { useFrame } from "@react-three/fiber";
import fragmentShader from "@shaders/healthbar/healthbarFragShader.glsl";
import vertexShader from "@shaders/healthbar/healthbarVertShader.glsl";
import {
  forwardRef,
  RefObject,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Color,
  ColorRepresentation,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
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
  scale = [1, 0.2, 0.05],
  lowHealthThreshold = 0.2,
  fillColor = "#15ff00",
  bgColor = "#000000",
  borderColor = "#ffffff",
  borderWidth = 0.2,
  waveAmp = 0.1,
  waveFreq = 3,
  waveSpeed = 0.5,
  shape = Shapes.CIRCLE,
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

  const sizeVec = useMemo(() => new Vector3(...scale), [scale]);

  const uniforms = useMemo(
    () => ({
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
    }),
    [
      health,
      lowHealthThreshold,
      fillColorVec,
      backgroundColorVec,
      borderColorVec,
      borderWidth,
      waveAmp,
      waveFreq,
      waveSpeed,
      sizeVec,
      shape,
    ]
  );

  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    materialRef.current.uniforms.health.value = health.current;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[4, 4, 1, 1]} />
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
