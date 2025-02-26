import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ChunkSystem, ChunkCoord } from './ChunkManager';
import { Vector3, ShaderMaterial, Mesh } from 'three';
import * as THREE from 'three';

// Vertex shader for GPU-accelerated terrain generation
const terrainVertexShader = `
  uniform float uTime;
  uniform vec2 uOffset;
  uniform float uElevation;
  uniform float uScale;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  
  // Classic Perlin 3D noise 
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

  float noise(vec3 P) {
    vec3 Pi0 = floor(P); // Integer part
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
    vec4 iz0 = vec4(Pi0.z);
    vec4 iz1 = vec4(Pi1.z);

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.x, Pf1.y, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.x, Pf0.y, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.y, Pf1.z));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
  
  // FBM (Fractional Brownian Motion) for layered noise
  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100);
    for (int i = 0; i < 5; ++i) {
      v += a * noise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
  
  void main() {
    // Calculate world position based on local position and chunk offset
    vec3 worldPosition = position + vec3(uOffset.x, 0.0, uOffset.y);
    
    // Apply elevation changes using noise
    float elevation = fbm(vec3(
      worldPosition.x * uNoiseFrequency, 
      worldPosition.z * uNoiseFrequency, 
      0.0
    )) * uNoiseAmplitude;
    
    // Add ridged noise for mountains
    float ridged = 1.0 - abs(noise(vec3(
      worldPosition.x * uNoiseFrequency * 0.5, 
      worldPosition.z * uNoiseFrequency * 0.5, 
      0.0
    )));
    ridged = ridged * ridged * uNoiseAmplitude * 1.5;
    
    // Apply different noise for different terrain features
    float finalElevation = elevation;
    
    // Add mountain ridges where noise is high
    if (elevation > 0.2) {
      finalElevation += ridged;
    }
    
    // Scale the elevation
    finalElevation *= uElevation;
    
    // Apply the elevation to Y coordinate
    vec3 newPosition = vec3(position.x, finalElevation, position.z);
    
    // Pass to fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(
      newPosition + vec3(uOffset.x, 0.0, uOffset.y), 
      1.0
    );
    
    // Pass the elevation to the fragment shader as varying
    vElevation = finalElevation / uElevation;
    vWorldPosition = worldPosition;
  }

  // Define varyings
  varying float vElevation;
  varying vec3 vWorldPosition;
`;

// Fragment shader for terrain coloring based on elevation and slope
const terrainFragmentShader = `
  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform vec3 uWaterColor;
  uniform float uWaterLevel;
  uniform float uTime;
  
  // Varying from vertex shader
  varying float vElevation;
  varying vec3 vWorldPosition;
  
  void main() {
    // Mix colors based on elevation
    vec3 color;
    
    // Water
    if (vElevation < uWaterLevel) {
      // Animate water
      float waterRipple = sin(vWorldPosition.x * 20.0 + vWorldPosition.z * 20.0 + uTime) * 0.05 + 0.95;
      color = uWaterColor * waterRipple;
    } 
    // Low terrain (sand, dirt)
    else if (vElevation < 0.3) {
      float t = vElevation / 0.3;
      color = mix(uLowColor, uMidColor, t);
    } 
    // Mid terrain (grass, forests)
    else if (vElevation < 0.7) {
      float t = (vElevation - 0.3) / 0.4;
      color = mix(uMidColor, uHighColor, t);
    } 
    // High terrain (mountains, snow)
    else {
      color = uHighColor + vec3(vElevation - 0.7) * 0.5;
    }
    
    // Apply simple shadow and lighting
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Create a GPU-accelerated terrain chunk system
export const createShaderTerrainSystem = (
  resolution = 64, // Higher resolution for more detailed terrain
  seed = Math.random() * 1000
): ChunkSystem => {
  // Define the chunk size in world units
  const chunkSize = 32;
  
  // Precompute materials for different biomes to avoid recreation
  const materials = {
    default: new ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uElevation: { value: 20 },
        uScale: { value: 1 },
        uNoiseFrequency: { value: 0.02 },
        uNoiseAmplitude: { value: 1.0 },
        uLowColor: { value: new THREE.Color('#e0c782') }, // Sand
        uMidColor: { value: new THREE.Color('#4b7f52') },  // Grass
        uHighColor: { value: new THREE.Color('#606060') }, // Rock
        uWaterColor: { value: new THREE.Color('#3d85c6') },// Water
        uWaterLevel: { value: 0.15 }                       // Water level threshold
      },
      side: THREE.DoubleSide
    }),
    
    desert: new ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uElevation: { value: 10 },  // Less elevation variation in deserts
        uScale: { value: 1 },
        uNoiseFrequency: { value: 0.03 }, // More frequent dunes
        uNoiseAmplitude: { value: 0.8 },
        uLowColor: { value: new THREE.Color('#e8c17d') }, // Light sand
        uMidColor: { value: new THREE.Color('#d4ad60') },  // Dark sand
        uHighColor: { value: new THREE.Color('#b08d50') }, // Rocky sand
        uWaterColor: { value: new THREE.Color('#3d85c6') },
        uWaterLevel: { value: 0.05 }  // Less water in desert
      },
      side: THREE.DoubleSide
    }),
    
    mountains: new ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uElevation: { value: 40 },  // More elevation in mountains
        uScale: { value: 1 },
        uNoiseFrequency: { value: 0.015 }, // Larger features
        uNoiseAmplitude: { value: 1.2 },   // More dramatic terrain
        uLowColor: { value: new THREE.Color('#5a7952') }, // Dark forest
        uMidColor: { value: new THREE.Color('#707070') },  // Rock
        uHighColor: { value: new THREE.Color('#ffffff') }, // Snow
        uWaterColor: { value: new THREE.Color('#4f819e') },// Mountain lake
        uWaterLevel: { value: 0.1 }
      },
      side: THREE.DoubleSide
    })
  };
  
  // Prevent memory leaks by tracking elements to dispose
  const disposables = new Set<THREE.Object3D | THREE.Material | THREE.BufferGeometry>();
  
  // Create a simple biome generator based on seed
  const getBiome = (x: number, z: number): 'default' | 'desert' | 'mountains' => {
    const noiseValue = Math.sin(x * 0.01 + seed) * Math.cos(z * 0.01 + seed);
    
    if (noiseValue < -0.3) return 'desert';
    if (noiseValue > 0.3) return 'mountains';
    return 'default';
  };
  
  return {
    chunkSize,
    viewDistance: 10,
    maxActiveChunks: 256,
    loadingStrategy: 'hybrid',
    
    // Function to create a terrain chunk
    createChunk: (coord: ChunkCoord, position: Vector3) => {
      // Determine biome for this chunk
      const centerX = position.x;
      const centerZ = position.z;
      const biomeType = getBiome(centerX, centerZ);
      
      // Get the appropriate material for this biome
      const material = materials[biomeType].clone();
      disposables.add(material);
      
      // Update the offset based on chunk position
      material.uniforms.uOffset.value.set(position.x, position.z);
      
      // Create a plane geometry for the terrain
      const geometry = new THREE.PlaneGeometry(
        chunkSize, 
        chunkSize, 
        resolution, 
        resolution
      );
      geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
      disposables.add(geometry);
      
      // Create the terrain mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      disposables.add(mesh);
      
      // Create a component to animate the time uniform
      const ChunkRenderer = () => {
        const meshRef = useRef<THREE.Mesh>(null);
        
        // Update time uniform for animations
        useFrame(({ clock }) => {
          if (meshRef.current) {
            const material = meshRef.current.material as ShaderMaterial;
            material.uniforms.uTime.value = clock.getElapsedTime();
          }
        });
        
        return <primitive ref={meshRef} object={mesh} />;
      };
      
      return <ChunkRenderer />;
    },
    
    // Clean up resources on chunk unload
    onChunkUnload: (chunk) => {
      // Find and dispose of three.js objects
      React.Children.forEach(chunk.object as React.ReactElement, (child) => {
        if (child && child.props && child.props.object) {
          const obj = child.props.object;
          
          // Dispose geometry, material, and textures
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) {
              obj.geometry.dispose();
            }
            
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(material => {
                  if (material.map) material.map.dispose();
                  material.dispose();
                });
              } else {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
              }
            }
          }
        }
      });
      
      // Clear from disposables set
      disposables.clear();
    }
  };
};
