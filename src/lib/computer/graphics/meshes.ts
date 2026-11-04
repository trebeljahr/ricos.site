import { add, cross, dot, normalize, scaled, subtract, type Vec2, type Vec3 } from "./matrix";

export type Triangle = readonly [number, number, number];

/** A mesh is two lists: corners, and triples of indices into the corners. */
export type Mesh = {
  positions: Vec3[];
  uvs: Vec2[];
  normals: Vec3[];
  tangents: Vec3[];
  /** Counter-clockwise when seen from outside. */
  triangles: Triangle[];
  /** One colour per triangle, for telling faces apart. */
  faceColors?: Vec3[];
};

/** Fills in what a builder left out: smooth normals from the faces, tangents from the UVs. */
export function completeMesh(
  mesh: Pick<Mesh, "positions" | "triangles"> &
    Partial<Pick<Mesh, "uvs" | "normals" | "faceColors">>,
): Mesh {
  const { positions, triangles } = mesh;
  const uvs = mesh.uvs ?? positions.map((p): Vec2 => [p[0] * 0.5 + 0.5, p[1] * 0.5 + 0.5]);

  let normals = mesh.normals;
  if (!normals) {
    const sums: Vec3[] = positions.map(() => [0, 0, 0]);
    for (const [a, b, c] of triangles) {
      // The cross product's length is twice the area, so big faces count for more.
      const face = cross(
        subtract(positions[b], positions[a]),
        subtract(positions[c], positions[a]),
      );
      sums[a] = add(sums[a], face);
      sums[b] = add(sums[b], face);
      sums[c] = add(sums[c], face);
    }
    normals = sums.map(normalize);
  }

  const tangentSums: Vec3[] = positions.map(() => [0, 0, 0]);
  for (const [a, b, c] of triangles) {
    const edge1 = subtract(positions[b], positions[a]);
    const edge2 = subtract(positions[c], positions[a]);
    const du1 = uvs[b][0] - uvs[a][0];
    const dv1 = uvs[b][1] - uvs[a][1];
    const du2 = uvs[c][0] - uvs[a][0];
    const dv2 = uvs[c][1] - uvs[a][1];
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-9) continue;
    const tangent = scaled(subtract(scaled(edge1, dv2), scaled(edge2, dv1)), 1 / det);
    tangentSums[a] = add(tangentSums[a], tangent);
    tangentSums[b] = add(tangentSums[b], tangent);
    tangentSums[c] = add(tangentSums[c], tangent);
  }
  const tangents = tangentSums.map((tangent, i): Vec3 => {
    const n = normals[i];
    // Square to the normal, and any direction at all where the UVs give none (a pole).
    const flat = subtract(tangent, scaled(n, dot(n, tangent)));
    if (dot(flat, flat) > 1e-12) return normalize(flat);
    return normalize(cross(Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], n));
  });

  return { positions, uvs, normals, tangents, triangles, faceColors: mesh.faceColors };
}

const FACE_COLORS: Vec3[] = [
  [224, 96, 80],
  [238, 170, 76],
  [120, 196, 110],
  [92, 170, 226],
  [170, 124, 220],
  [228, 120, 180],
];

const quadTriangles = (a: number, b: number, c: number, d: number): Triangle[] => [
  [a, b, c],
  [a, c, d],
];

/** Every triangle of a quad-based face list gets its face's colour. */
const colorsPerFace = (facesOfTriangles: number[]) =>
  facesOfTriangles.map((face) => FACE_COLORS[face % FACE_COLORS.length]);

export const triangleMesh = (): Mesh =>
  completeMesh({
    positions: [
      [-1, -0.85, 0],
      [1, -0.85, 0],
      [0, 0.95, 0],
    ],
    uvs: [
      [0, 1],
      [1, 1],
      [0.5, 0],
    ],
    triangles: [[0, 1, 2]],
    faceColors: colorsPerFace([0]),
  });

export const quadMesh = (): Mesh =>
  completeMesh({
    positions: [
      [-1, -1, 0],
      [1, -1, 0],
      [1, 1, 0],
      [-1, 1, 0],
    ],
    uvs: [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
    triangles: quadTriangles(0, 1, 2, 3),
    faceColors: colorsPerFace([0, 1]),
  });

/** Eight corners shared by six faces. Compact, but each corner gets just one normal. */
export const sharedCube = (): Mesh => {
  const positions: Vec3[] = [
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
  ];
  const faces = [
    [0, 1, 2, 3],
    [1, 5, 6, 2],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ];
  return completeMesh({
    positions,
    triangles: faces.flatMap(([a, b, c, d]) => quadTriangles(a, b, c, d)),
    faceColors: colorsPerFace(faces.flatMap((_, face) => [face, face])),
  });
};

/** Four corners per face: 24 in all. Each face can have its own normals and UVs. */
export const splitCube = (): Mesh => {
  const shared = sharedCube();
  const faces = [
    [0, 1, 2, 3],
    [1, 5, 6, 2],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ];
  const positions: Vec3[] = [];
  const normals: Vec3[] = [];
  const uvs: Vec2[] = [];
  const triangles: Triangle[] = [];
  faces.forEach((corners) => {
    const start = positions.length;
    const [a, b, , d] = corners.map((corner) => shared.positions[corner]);
    const normal = normalize(cross(subtract(b, a), subtract(d, a)));
    corners.forEach((corner, i) => {
      positions.push(shared.positions[corner]);
      normals.push(normal);
      uvs.push(
        (
          [
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ] as Vec2[]
        )[i],
      );
    });
    triangles.push(...quadTriangles(start, start + 1, start + 2, start + 3));
  });
  return completeMesh({ positions, normals, uvs, triangles, faceColors: shared.faceColors });
};

export const pyramid = (): Mesh => {
  const positions: Vec3[] = [
    [-1, -0.8, 1],
    [1, -0.8, 1],
    [1, -0.8, -1],
    [-1, -0.8, -1],
    [0, 1.1, 0],
  ];
  return completeMesh({
    positions,
    triangles: [
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
      [3, 2, 1],
      [3, 1, 0],
    ],
    faceColors: colorsPerFace([0, 1, 2, 3, 4, 4]),
  });
};

/**
 * A house with a chimney. Unlike a cube it shows which way is up, which way it
 * faces and whether it got mirrored, which is what a demo about spaces needs.
 */
export const house = (): Mesh => {
  const w = 1;
  const d = 0.8;
  const eave = 0.25;
  const ridge = 1;
  const positions: Vec3[] = [
    [-w, -1, d], // 0 front
    [w, -1, d],
    [w, eave, d],
    [-w, eave, d],
    [-w, -1, -d], // 4 back
    [w, -1, -d],
    [w, eave, -d],
    [-w, eave, -d],
    [-w, ridge, 0], // 8 ridge
    [w, ridge, 0],
    // Chimney, standing on the right of the roof.
    [0.45, 0.62, 0.42], // 10
    [0.75, 0.62, 0.42],
    [0.75, 1.25, 0.42],
    [0.45, 1.25, 0.42],
    [0.45, 0.62, 0.12],
    [0.75, 0.62, 0.12],
    [0.75, 1.25, 0.12],
    [0.45, 1.25, 0.12],
  ];
  const triangles: Triangle[] = [];
  const faceColors: Vec3[] = [];
  const face = (color: Vec3, a: number, b: number, c: number, d2?: number) => {
    triangles.push([a, b, c]);
    faceColors.push(color);
    if (d2 !== undefined) {
      triangles.push([a, c, d2]);
      faceColors.push(color);
    }
  };
  const front: Vec3 = [236, 214, 170];
  const side: Vec3 = [205, 180, 138];
  const back: Vec3 = [170, 150, 118];
  const roof: Vec3 = [198, 84, 66];
  const roofBack: Vec3 = [156, 64, 52];
  const floor: Vec3 = [110, 104, 92];
  const brick: Vec3 = [140, 90, 74];
  face(front, 0, 1, 2, 3);
  face(side, 1, 5, 6, 2);
  face(back, 5, 4, 7, 6);
  face(side, 4, 0, 3, 7);
  face(floor, 4, 5, 1, 0);
  face(roof, 3, 2, 9, 8);
  face(roofBack, 6, 7, 8, 9);
  face(side, 2, 6, 9);
  face(side, 7, 3, 8);
  face(brick, 10, 11, 12, 13);
  face(brick, 11, 15, 16, 12);
  face(brick, 15, 14, 17, 16);
  face(brick, 14, 10, 13, 17);
  face(roofBack, 13, 12, 16, 17);
  return completeMesh({ positions, triangles, faceColors });
};

/** Latitude and longitude. The seam column repeats so its UVs can run from 0 to 1. */
export const sphere = (segments = 12, rings = 8, radius = 1.2): Mesh => {
  const positions: Vec3[] = [];
  const normals: Vec3[] = [];
  const uvs: Vec2[] = [];
  const triangles: Triangle[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const v = ring / rings;
    const polar = v * Math.PI;
    for (let segment = 0; segment <= segments; segment++) {
      const u = segment / segments;
      const around = u * Math.PI * 2;
      const normal: Vec3 = [
        Math.sin(polar) * Math.sin(around),
        Math.cos(polar),
        Math.sin(polar) * Math.cos(around),
      ];
      normals.push(normal);
      positions.push(scaled(normal, radius));
      uvs.push([u * 2, v]);
    }
  }
  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const a = ring * stride + segment;
      const b = a + stride;
      const c = b + 1;
      const d = a + 1;
      // The rings at the poles have shrunk to a point, so each square there is one triangle.
      if (ring === 0) triangles.push([a, b, c]);
      else if (ring === rings - 1) triangles.push([a, b, d]);
      else triangles.push([a, b, d], [d, b, c]);
    }
  }
  return completeMesh({ positions, normals, uvs, triangles });
};

export const torus = (segments = 20, sides = 10, major = 0.95, minor = 0.42): Mesh => {
  const positions: Vec3[] = [];
  const normals: Vec3[] = [];
  const uvs: Vec2[] = [];
  const triangles: Triangle[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const around = u * Math.PI * 2;
    for (let j = 0; j <= sides; j++) {
      const v = j / sides;
      const tube = v * Math.PI * 2;
      const normal: Vec3 = [
        Math.cos(tube) * Math.sin(around),
        Math.sin(tube),
        Math.cos(tube) * Math.cos(around),
      ];
      normals.push(normal);
      positions.push([
        (major + minor * Math.cos(tube)) * Math.sin(around),
        minor * Math.sin(tube),
        (major + minor * Math.cos(tube)) * Math.cos(around),
      ]);
      uvs.push([u * 3, 1 - v]);
    }
  }
  const stride = sides + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * stride + j;
      const b = a + stride;
      const c = b + 1;
      const d = a + 1;
      triangles.push([a, b, c], [a, c, d]);
    }
  }
  return completeMesh({ positions, normals, uvs, triangles });
};

/** A flat wall made of a grid of quads, which shows a normal map best. */
export const wall = (cells = 1, size = 1.5): Mesh => {
  const positions: Vec3[] = [];
  const uvs: Vec2[] = [];
  const normals: Vec3[] = [];
  const triangles: Triangle[] = [];
  for (let y = 0; y <= cells; y++) {
    for (let x = 0; x <= cells; x++) {
      const u = x / cells;
      const v = y / cells;
      positions.push([(u * 2 - 1) * size, (1 - v * 2) * size, 0]);
      uvs.push([u * 2, v * 2]);
      normals.push([0, 0, 1]);
    }
  }
  const stride = cells + 1;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const a = y * stride + x;
      const b = a + stride;
      const c = b + 1;
      const d = a + 1;
      triangles.push([a, b, c], [a, c, d]);
    }
  }
  return completeMesh({ positions, normals, uvs, triangles });
};

/** Bytes a mesh takes, as a GPU would be handed it: three 32-bit floats per position. */
export function meshBytes(mesh: Mesh) {
  const vertexBuffer = mesh.positions.length * 12;
  const indexBuffer = mesh.triangles.length * 3 * 2;
  const withoutIndices = mesh.triangles.length * 3 * 12;
  return { vertexBuffer, indexBuffer, withoutIndices };
}

/** The four bytes of a 32-bit float, in the order memory holds them on a little-endian machine. */
export function floatBytes(value: number): [number, number, number, number] {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value, true);
  return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
}

/** Each unique edge once, for drawing wireframes. */
export function meshEdges(mesh: Mesh): [number, number][] {
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  const count = mesh.positions.length;
  for (const [a, b, c] of mesh.triangles) {
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = Math.min(p, q) * count + Math.max(p, q);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([p, q]);
    }
  }
  return edges;
}
