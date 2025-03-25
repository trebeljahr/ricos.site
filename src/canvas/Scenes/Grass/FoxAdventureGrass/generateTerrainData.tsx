import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { BufferAttribute, BufferGeometry } from "three";

export type TerrainData = {
  heights: number[];
  vertices: number[];
  uvs: number[];
  indices: number[];
  scale: { x: number; y: number; z: number };
  nsubdivs: number;
  geometry: BufferGeometry;
};

export const generateTerrainData = (planeSize: number, chunkSize: number) => {
  const nsubdivs = planeSize / chunkSize;
  const scale = { x: planeSize, y: 1.5, z: planeSize };

  const heights = new Float32Array((nsubdivs + 1) * (nsubdivs + 1));
  const vertices = new Float32Array((nsubdivs + 1) * (nsubdivs + 1) * 3);
  const uvs = new Float32Array((nsubdivs + 1) * (nsubdivs + 1) * 2);

  // Générer les hauteurs et les UVs
  for (let i = 0; i <= nsubdivs; i++) {
    for (let j = 0; j <= nsubdivs; j++) {
      const x = j / nsubdivs;
      const z = i / nsubdivs;

      const nx = x * Math.PI * 2;
      const nz = z * Math.PI * 2;
      const { height } = getHeight(nx, nz);

      const heightIndex = j * (nsubdivs + 1) + i;
      heights[heightIndex] = height;

      const vertexIndex = (i * (nsubdivs + 1) + j) * 3;
      vertices[vertexIndex] = (j / nsubdivs - 0.5) * scale.x;
      vertices[vertexIndex + 1] = height * scale.y;
      vertices[vertexIndex + 2] = (i / nsubdivs - 0.5) * scale.z;

      const uvIndex = (i * (nsubdivs + 1) + j) * 2;
      uvs[uvIndex] = x;
      uvs[uvIndex + 1] = z;
    }
  }

  const indices = [];
  for (let i = 0; i < nsubdivs; i++) {
    for (let j = 0; j < nsubdivs; j++) {
      const a = i * (nsubdivs + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (nsubdivs + 1) + j;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const newTerrainData = {
    heights: Array.from(heights),
    vertices: Array.from(vertices),
    uvs: Array.from(uvs),
    indices,
    scale,
    nsubdivs,
    geometry,
  };
  return newTerrainData;
};
