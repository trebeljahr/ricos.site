import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Box3,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector3,
  FrontSide,
  InstancedBufferGeometry,
  Sphere,
  Vector4,
  Vector2,
} from "three";
import grassFragmentShader from "./shaders/grassFragmentShader.glsl";
import grassVertexShader from "./shaders/grassVertexShader.glsl";
import { useTexture } from "@react-three/drei";

type SimondevGrassProps = {
  grassPatchSize?: number;
  grassMaxDistance?: number;
  grassWidth?: number;
  grassHeight?: number;
  grassSegments?: number;
  numGrassBlades?: number;
};

function createMesh(
  geo: BufferGeometry,
  mat: ShaderMaterial,
  grassGroup: Group
) {
  const mesh = new Mesh(geo, mat);
  mesh.position.set(0, 0, 0);
  mesh.visible = false;

  grassGroup.add(mesh);
  return mesh;
}

export const SimondevGrass = ({
  grassPatchSize = 10,
  grassMaxDistance = 500,
  grassWidth = 0.25,
  grassHeight = 2,
  grassSegments = 5,
  numGrassBlades = 256,
}: SimondevGrassProps) => {
  const grassGroupRef = useRef<Group>(null!);
  const grassTexture1 = useTexture(
    "/3d-assets/textures/grass/simondev-grass1.png"
  );
  const grassTexture2 = useTexture(
    "/3d-assets/textures/grass/simondev-grass2.png"
  );

  const meshes = useRef<Record<string, Mesh | null>>({});

  const { grassMaterial, grassGeometry, unusedMeshes } = useMemo(() => {
    const grassUniforms = {
      grassParams: {
        value: new Vector4(
          grassSegments,
          grassPatchSize,
          grassWidth,
          grassHeight
        ),
      },
      grassDiffuse: {
        value: grassTexture1,
      },
      time: { value: 0 },
      resolution: { value: new Vector2(1, 1) },
    };

    const grassMaterial = new ShaderMaterial({
      uniforms: grassUniforms,
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: FrontSide,
    });

    const grassGeometry = createGeometry(
      grassSegments,
      numGrassBlades,
      grassPatchSize
    );

    return {
      grassMaterial,
      grassGeometry,
      unusedMeshes: [] as Mesh[],
    };
  }, []);

  const AABB_TMP = new Box3();
  const cameraPosXZ = new Vector3(0, 0, 0);

  const grassSizeVector = new Vector3(grassPatchSize, 1000, grassPatchSize);
  const tempGrassCellVector = new Vector3(0, 0, 0);

  useFrame(function frame({ camera, clock }) {
    const totalTime = clock.getElapsedTime();
    grassMaterial.uniforms.time.value = totalTime;

    const baseCellPos = camera.position.clone();
    baseCellPos.divideScalar(grassPatchSize);
    baseCellPos.floor();
    baseCellPos.multiplyScalar(grassPatchSize);

    for (let c of grassGroupRef.current.children) {
      c.visible = false;
    }

    const currentMeshes = meshes.current;
    const newMeshes = {};
    cameraPosXZ.set(camera.position.x, 0, camera.position.z);

    for (let x = -10; x < 10; x++) {
      for (let z = -10; z < 10; z++) {
        tempGrassCellVector.set(
          baseCellPos.x + x * grassPatchSize,
          0,
          baseCellPos.z + z * grassPatchSize
        );

        const currentCell = tempGrassCellVector.clone();
        AABB_TMP.setFromCenterAndSize(currentCell, grassSizeVector);
        const distToCell = AABB_TMP.distanceToPoint(cameraPosXZ);
        if (distToCell > grassMaxDistance) {
          continue;
        }

        const newMeshes = {} as Record<string, Mesh>;
        const key = `${currentCell.x}_${currentCell.z}`;
        if (!(key in currentMeshes)) {
          if (unusedMeshes.length > 0) {
            newMeshes[key] = unusedMeshes.pop()!;
          } else {
            newMeshes[key] = createMesh(
              grassGeometry,
              grassMaterial,
              grassGroupRef.current
            );
          }
        } else {
          newMeshes[key] = currentMeshes[key]!;
          currentMeshes[key] = null;
        }

        const mesh = newMeshes[key];
        mesh.position.copy(currentCell);
        mesh.position.y = 0;
        mesh.visible = true;
      }
    }

    for (let k in currentMeshes) {
      if (currentMeshes[k] !== null) {
        unusedMeshes.push(currentMeshes[k]);
      }
    }

    meshes.current = newMeshes;
  });

  return <group ref={grassGroupRef}></group>;
};

function createGeometry(
  segments: number,
  numGrass: number,
  grassPatchSize: number
) {
  const vertices = (segments + 1) * 2;
  const indices = [];

  for (let i = 0; i < segments; ++i) {
    const vi = i * 2;
    indices[i * 12 + 0] = vi + 0;
    indices[i * 12 + 1] = vi + 1;
    indices[i * 12 + 2] = vi + 2;

    indices[i * 12 + 3] = vi + 2;
    indices[i * 12 + 4] = vi + 1;
    indices[i * 12 + 5] = vi + 3;

    const fi = vertices + vi;
    indices[i * 12 + 6] = fi + 2;
    indices[i * 12 + 7] = fi + 1;
    indices[i * 12 + 8] = fi + 0;

    indices[i * 12 + 9] = fi + 3;
    indices[i * 12 + 10] = fi + 1;
    indices[i * 12 + 11] = fi + 2;
  }

  const geo = new InstancedBufferGeometry();
  geo.instanceCount = numGrass;
  geo.setIndex(indices);
  geo.boundingSphere = new Sphere(new Vector3(0, 0, 0), 1 + grassPatchSize * 2);

  return geo;
}
