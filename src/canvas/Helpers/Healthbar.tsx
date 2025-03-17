import { useFrame } from "@react-three/fiber";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { DoubleSide, Mesh, ShaderMaterial, Vector3, Vector4 } from "three";
import fragmentShader from "@shaders/healthbar/healthbarFragShader.glsl";
import vertexShader from "@shaders/healthbar/healthbarVertShader.glsl";

// Shape enum
export const Shapes = {
  CIRCLE: 0,
  BOX: 1,
  RHOMBUS: 2,
};

export const HealthBar = forwardRef(
  (
    {
      initialHealth = 0.75, // Initial health value (0-1)
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = [1, 0.2, 0.05],
      lowHealthThreshold = 0.2,
      fillColor = [0, 1, 0, 1], // Green
      backgroundColor = [0.1, 0.1, 0.1, 0.5],
      borderColor = [0.3, 0.3, 0.3, 1],
      borderWidth = 0.02,
      waveAmp = 0.01,
      waveFreq = 8,
      waveSpeed = 0.5,
      shape = Shapes.CIRCLE,
      autoAnimate = false,
      animationSpeed = 0.01,
      onHealthChange,
      minHealth = 0,
      maxHealth = 1,
    }: {
      initialHealth?: number;
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
      lowHealthThreshold?: number;
      fillColor?: [number, number, number, number];
      backgroundColor?: [number, number, number, number];
      borderColor?: [number, number, number, number];
      borderWidth?: number;
      waveAmp?: number;
      waveFreq?: number;
      waveSpeed?: number;
      shape?: number;
      autoAnimate?: boolean;
      animationSpeed?: number;
      onHealthChange?: (health: number) => void;
      minHealth?: number;
      maxHealth?: number;
    },
    ref
  ) => {
    const meshRef = useRef<Mesh>(null!);
    const materialRef = useRef<ShaderMaterial>(null!);

    const [health, setHealth] = useState(initialHealth);

    // Optional auto-animation
    useEffect(() => {
      if (!autoAnimate) return;

      const timer = setInterval(() => {
        setHealth((prev) => {
          const newHealth = prev - animationSpeed;
          if (newHealth <= minHealth) {
            return maxHealth;
          }
          return newHealth;
        });
      }, 200);

      return () => clearInterval(timer);
    }, [autoAnimate, animationSpeed, minHealth, maxHealth]);

    // Notify parent when health changes
    useEffect(() => {
      if (onHealthChange) {
        onHealthChange(health);
      }
    }, [health, onHealthChange]);

    // Convert color arrays to Vector4
    const fillColorVec = useMemo(() => new Vector4(...fillColor), [fillColor]);
    const backgroundColorVec = useMemo(
      () => new Vector4(...backgroundColor),
      [backgroundColor]
    );
    const borderColorVec = useMemo(
      () => new Vector4(...borderColor),
      [borderColor]
    );
    const sizeVec = useMemo(() => new Vector3(...scale), [scale]);

    // Create shader uniforms
    const uniforms = useMemo(
      () => ({
        healthNormalized: { value: health },
        lowHealthThreshold: { value: lowHealthThreshold },
        fillColor: { value: fillColorVec },
        backgroundColor: { value: backgroundColorVec },
        borderColor: { value: borderColorVec },
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

    // Update time and health values in the shader
    useFrame((state) => {
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
        materialRef.current.uniforms.healthNormalized.value = health;
      }
    });

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => {
        const increaseHealth = (amount = 0.1) => {
          setHealth((prev) => Math.min(maxHealth, prev + amount));
        };

        const decreaseHealth = (amount = 0.1) => {
          setHealth((prev) => Math.max(minHealth, prev - amount));
        };

        const setHealthValue = (value: number) => {
          setHealth(Math.max(minHealth, Math.min(maxHealth, value)));
        };

        return {
          increaseHealth,
          decreaseHealth,
          setHealthValue,
          getHealth: () => health,
        };
      },
      [health, maxHealth, minHealth]
    );

    return (
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[1, 1, 1, 1]} />
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
  }
);
