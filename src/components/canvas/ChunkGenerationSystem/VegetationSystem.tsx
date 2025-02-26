import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, Object3D, InstancedMesh } from 'three';
import { ChunkSystem, ChunkCoord, useChunkManager, worldToChunkCoord } from './ChunkManager';
import * as THREE from 'three';

// Define different plant types
type PlantType = 'tree' | 'bush' | 'grass';

// Create a vegetation placement system
class VegetationPlacer {
  private seed: number;
  private terrainGenerator: any; // Would reference the terrain generator
  
  constructor(seed = Math.random() * 1000, terrainGenerator: any) {
    this.seed = seed;
    this.terrainGenerator = terrainGenerator;
  }
  
  // Deterministic random based on position
  random(x: number, z: number, salt = 0): number {
    const s = Math.sin((x + salt) * 12.9898 + (z + salt) * 78.233 + this.seed) * 43758.5453;
    return s - Math.floor(s);
  }
  
  // Check if a plant should be placed at this position
  shouldPlacePlant(x: number, z: number, density = 0.02): boolean {
    const r = this.random(x, z);
    return r < density;
  }
  
  // Get plant type at a position
  getPlantType(x: number, z: number): PlantType {
    const biome = this.terrainGenerator.getBiome(x, z);
    const r = this.random(x, z, 100);
    
    // Different biomes have different plant distributions
    if (biome === 'desert') {
      return r < 0.9 ? 'bush' : 'tree';
    } else if (biome === 'mountains') {
      return r < 0.3 ? 'tree' : (r < 0.8 ? 'bush' : 'grass');
    } else {
      // Plains
      return r < 0.2 ? 'tree' : (r < 0.5 ? 'bush' : 'grass');
    }
  }
  
  // Get positions for plants in a chunk
  getPlantPositions(chunkCoord: ChunkCoord, chunkSize: number, density = 0.001): Array<{
    position: Vector3;
    type: PlantType;
    scale: number;
    rotation: number;
  }> {
    const plants = [];
    const worldX = chunkCoord[0] * chunkSize;
    const worldZ = chunkCoord[2] * chunkSize;
    
    // Try to place plants
    for (let z = 0; z < chunkSize; z += 2) {
      for (let x = 0; x < chunkSize; x += 2) {
        const posX = worldX + x;
        const posZ = worldZ + z;
        
        if (this.shouldPlacePlant(posX, posZ, density)) {
          const type = this.getPlantType(posX, posZ);
          const height = this.terrainGenerator.getHeight(posX, posZ);
          
          // Randomize position a bit for natural look
          const offsetX = this.random(posX, posZ, 200) * 2 - 1;
          const offsetZ = this.random(posX, posZ, 300) * 2 - 1;
          
          // Add some variation to scale and rotation
          const scale = 0.8 + this.random(posX, posZ, 400) * 0.4;
          const rotation = this.random(posX, posZ, 500) * Math.PI * 2;
          
          plants.push({
            position: new Vector3(
              posX + offsetX - worldX,
              height,
              posZ + offsetZ - worldZ
            ),
            type,
            scale,
            rotation
          });
        }
      }
    }
    
    return plants;
  }
}

// Create a tree mesh
const Tree = React.forwardRef<THREE.Group>((props, ref) => {
  return (
    <group ref={ref} scale={[1, 1, 1]}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Foliage */}
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color="#388E3C" />
      </mesh>
    </group>
  );
});

// Create a bush mesh
const Bush = React.forwardRef<THREE.Group>((props, ref) => {
  return (
    <group ref={ref} scale={[0.7, 0.7, 0.7]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
});

// Create a grass mesh
const Grass = React.forwardRef<THREE.Group>((props, ref) => {
  return (
    <group ref={ref} scale={[0.4, 0.4, 0.4]}>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.02]} />
        <meshStandardMaterial color="#81C784" />
      </mesh>
    </group>
  );
});

// Create a vegetation chunk system
export const createVegetationChunkSystem = (
  terrainGenerator: any, // Would reference the terrain generator
  chunkSize = 32, // Should match terrain chunk size
  seed = Math.random() * 1000
): ChunkSystem => {
  // Create a vegetation placer
  const vegetationPlacer = new VegetationPlacer(seed, terrainGenerator);
  
  // Plant references to reuse
  const treeRef = React.createRef<THREE.Group>();
  const bushRef = React.createRef<THREE.Group>();
  const grassRef = React.createRef<THREE.Group>();
  
  // Prep instanced meshes for each plant type
  let instanced = false;
  const treeMatrix = new Object3D();
  const bushMatrix = new Object3D();
  const grassMatrix = new Object3D();
  
  return {
    chunkSize,
    viewDistance: 6, // Vegetation can have shorter view distance than terrain
    maxActiveChunks: 128,
    loadingStrategy: 'frustum-first', // Focus on what's visible for vegetation
    
    // Create a vegetation chunk
    createChunk: (coord: ChunkCoord, position: Vector3) => {
      // Get plant positions for this chunk
      const plants = vegetationPlacer.getPlantPositions(coord, chunkSize);
      
      // Count plants by type
      const treesCount = plants.filter(p => p.type === 'tree').length;
      const bushesCount = plants.filter(p => p.type === 'bush').length;
      const grassCount = plants.filter(p => p.type === 'grass').length;
      
      return (
        <group>
          {/* Invisible reference models - used for instancing */}
          <Tree ref={treeRef} />
          <Bush ref={bushRef} />
          <Grass ref={grassRef} />
          
          {/* Instanced meshes for each plant type */}
          <InstancedPlants 
            plantRef={treeRef}
            count={treesCount}
            plants={plants.filter(p => p.type === 'tree')}
          />
          
          <InstancedPlants 
            plantRef={bushRef}
            count={bushesCount}
            plants={plants.filter(p => p.type === 'bush')}
          />
          
          <InstancedPlants 
            plantRef={grassRef}
            count={grassCount}
            plants={plants.filter(p => p.type === 'grass')}
          />
        </group>
      );
    }
  };
};

// Component to handle instanced meshes for plants
const InstancedPlants: React.FC<{
  plantRef: React.RefObject<THREE.Group>;
  count: number;
  plants: Array<{
    position: Vector3;
    scale: number;
    rotation: number;
  }>;
}> = ({ plantRef, count, plants }) => {
  // References for the instanced meshes
  const instancedMeshes = useRef<THREE.InstancedMesh[]>([]);
  
  // Set up the instances
  useFrame(() => {
    // Wait until the plant reference is available
    if (!plantRef.current || !instancedMeshes.current.length) return;
    
    // Get all meshes in the plant
    const meshes: THREE.Mesh[] = [];
    plantRef.current.traverse(child => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    
    // Ensure we have an instanced mesh for each original mesh
    if (instancedMeshes.current.length !== meshes.length) {
      instancedMeshes.current = meshes.map(mesh => {
        const instancedMesh = new THREE.InstancedMesh(
          mesh.geometry.clone(),
          mesh.material,
          count
        );
        instancedMesh.castShadow = mesh.castShadow;
        instancedMesh.receiveShadow = mesh.receiveShadow;
        return instancedMesh;
      });
    }
    
    // Update all instances
    const matrix = new THREE.Matrix4();
    const tempObject = new THREE.Object3D();
    
    plants.forEach((plant, i) => {
      const { position, scale, rotation } = plant;
      
      tempObject.position.copy(position);
      tempObject.rotation.y = rotation;
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      
      // Apply the transformations to all instances
      for (let j = 0; j < instancedMeshes.current.length; j++) {
        if (i < count) {
          instancedMeshes.current[j].setMatrixAt(i, tempObject.matrix);
        }
      }
    });
    
    // Update the instance matrices
    instancedMeshes.current.forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  
  return (
    <>
      {instancedMeshes.current.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
};
