import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { FrontSide, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import type CustomShaderMaterialType from "three-custom-shader-material/vanilla";

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying float vWaveHeight;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  // PlaneGeometry uses X/Y coords, Z=0. Mesh is rotated -PI/2 on X
  // to become horizontal. So we use p.x and p.y as the two horizontal
  // axes, and displace along Z (the plane's normal = world Y after rotation).

  float waveHeight(vec2 p, float t) {
    float h = 0.0;

    // Gentle swell
    h += sin(p.x * 0.08 + t * 0.5 + sin(p.y * 0.06 + t * 0.15) * 0.8) * 0.4;
    h += sin(p.y * 0.07 - t * 0.35 + sin(p.x * 0.05 - t * 0.1) * 0.6) * 0.35;

    // Medium waves
    h += sin(p.x * 0.25 + p.y * 0.18 + t * 1.0) * 0.15;
    h += sin(p.x * 0.18 - p.y * 0.3 - t * 0.8) * 0.12;

    // Small chop
    h += sin(p.x * 0.6 + t * 1.8) * 0.06;
    h += sin(p.y * 0.7 - t * 1.5) * 0.05;
    h += sin((p.x + p.y) * 0.45 + t * 1.3) * 0.04;

    // Fine ripples
    h += sin(p.x * 1.3 + p.y * 0.7 + t * 2.2) * 0.02;
    h += sin(p.y * 1.5 - p.x * 0.4 - t * 1.9) * 0.015;

    return h;
  }

  void main() {
    vec3 pos = position;
    float t = uTime;

    // Displace along Z (plane normal), which becomes Y after rotation
    float h = waveHeight(pos.xy, t);
    vec3 displaced = vec3(pos.x, pos.y, h);

    // Normal from finite differences on the XY plane
    float e = 0.3;
    float hx = waveHeight(pos.xy + vec2(e, 0.0), t);
    float hy = waveHeight(pos.xy + vec2(0.0, e), t);
    // Tangent along X: (e, 0, hx-h), Tangent along Y: (0, e, hy-h)
    vec3 tx = vec3(e, 0.0, hx - h);
    vec3 ty = vec3(0.0, e, hy - h);
    vec3 waveNormal = normalize(cross(ty, tx));

    vWaveHeight = h;
    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vViewDir = normalize(cameraPosition - vWorldPos);

    csm_Position = displaced;
    csm_Normal = waveNormal;
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  varying float vWaveHeight;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    // Fresnel
    float NdotV = max(dot(vNormal, vViewDir), 0.0);
    float fresnel = pow(1.0 - NdotV, 3.0);

    // Base color: teal water, varies with wave height
    float h = clamp(vWaveHeight * 0.1 + 0.5, 0.0, 1.0);
    vec3 troughCol = vec3(0.05, 0.25, 0.40);
    vec3 crestCol = vec3(0.15, 0.55, 0.60);
    vec3 waterCol = mix(troughCol, crestCol, h);

    // Forward scatter toward sun
    float towardsSun = pow(max(0.0, dot(uSunDir, -vViewDir)), 5.0);
    waterCol += vec3(0.1, 0.5, 0.35) * towardsSun * 0.3;

    // Specular
    float spec = pow(max(0.0, dot(reflect(-uSunDir, vNormal), vViewDir)), 48.0);
    waterCol += vec3(1.0) * spec * 0.25;

    // Fresnel blend toward sky reflection color
    vec3 reflCol = vec3(0.4, 0.6, 0.7);
    waterCol = mix(waterCol, reflCol, fresnel * 0.5);

    // Alpha: semi-transparent looking down, opaque at grazing
    float alpha = mix(0.4, 0.95, fresnel);

    csm_DiffuseColor = vec4(waterCol, alpha);
  }
`;

export function WaterSurface({ position = [0, 0, 0] as [number, number, number], size = 500 }) {
  const materialRef = useRef<CustomShaderMaterialType>();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: new Vector3(0.5, 0.7, 0.3).normalize() },
    }),
    [],
  );

  const geometry = useMemo(() => {
    return new PlaneGeometry(size, size, 128, 128);
  }, [size]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={position}>
      <CustomShaderMaterial
        ref={materialRef}
        baseMaterial={MeshStandardMaterial}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
        side={FrontSide}
        roughness={0.1}
        metalness={0.05}
        envMapIntensity={0.4}
        color="#1a7a8a"
        opacity={0.65}
      />
    </mesh>
  );
}
