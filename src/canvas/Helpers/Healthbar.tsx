import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import fragmentShader from "@shaders/healthbar/healthbarFragShader.glsl";
import vertexShader from "@shaders/healthbar/healthbarVertShader.glsl";
import { Mesh, ShaderMaterial, Vector3, Vector4 } from "three";

// Shape enum
const Shapes = {
  CIRCLE: 0,
  BOX: 1,
  RHOMBUS: 2,
};

const HealthBar = ({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
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
}) => {
  const [health, setHealth] = useState(0.8);

  useEffect(() => {
    const timer = setInterval(() => {
      setHealth((prev) => {
        const newHealth = prev - 0.01;
        return newHealth <= 0 ? 1.0 : newHealth;
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // console.log("Health:", health);
  }, [health]);

  const mesh = useRef<Mesh>(null!);
  const material = useRef<ShaderMaterial>(null!);

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
    if (material.current) {
      material.current.uniforms.time.value = state.clock.getElapsedTime();
      material.current.uniforms.healthNormalized.value = health;
    }
  });

  return (
    <mesh
      ref={mesh}
      position={position}
      rotation={rotation}
      scale={1} // We handle scaling in the shader
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </mesh>
  );
};

export { HealthBar, Shapes };
