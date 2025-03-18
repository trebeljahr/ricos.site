import { Edge, Triangle, Vertex } from "./GraphStructures";
import { Vector3 } from "./Types";

class Matrix4x4 {
  private elements: number[][];

  constructor(rows: number[][]) {
    this.elements = rows;
  }

  get determinant(): number {
    const [
      [m00, m01, m02, m03],
      [m10, m11, m12, m13],
      [m20, m21, m22, m23],
      [m30, m31, m32, m33],
    ] = this.elements;

    const det3_123_123 =
      m11 * (m22 * m33 - m23 * m32) -
      m12 * (m21 * m33 - m23 * m31) +
      m13 * (m21 * m32 - m22 * m31);
    const det3_123_023 =
      m01 * (m22 * m33 - m23 * m32) -
      m02 * (m21 * m33 - m23 * m31) +
      m03 * (m21 * m32 - m22 * m31);
    const det3_123_013 =
      m01 * (m12 * m33 - m13 * m32) -
      m02 * (m11 * m33 - m13 * m31) +
      m03 * (m11 * m32 - m12 * m31);
    const det3_123_012 =
      m01 * (m12 * m23 - m13 * m22) -
      m02 * (m11 * m23 - m13 * m21) +
      m03 * (m11 * m22 - m12 * m21);

    return (
      m00 * det3_123_123 -
      m10 * det3_123_023 +
      m20 * det3_123_013 -
      m30 * det3_123_012
    );
  }

  static fromColumns(
    col0: number[],
    col1: number[],
    col2: number[],
    col3: number[]
  ): Matrix4x4 {
    return new Matrix4x4([
      [col0[0], col1[0], col2[0], col3[0]],
      [col0[1], col1[1], col2[1], col3[1]],
      [col0[2], col1[2], col2[2], col3[2]],
      [col0[3], col1[3], col2[3], col3[3]],
    ]);
  }
}

class DelaunayTetrahedron {
  public isBad: boolean = false;
  private circumcenter: Vector3 | undefined;
  private circumradiusSquared: number | undefined;

  constructor(
    public a: Vertex,
    public b: Vertex,
    public c: Vertex,
    public d: Vertex
  ) {
    this.calculateCircumsphere();
  }

  private calculateCircumsphere(): void {
    const posA = this.a.position;
    const posB = this.b.position;
    const posC = this.c.position;
    const posD = this.d.position;

    const matrixA = new Matrix4x4([
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    const aPosSqr = posA.x * posA.x + posA.y * posA.y + posA.z * posA.z;
    const bPosSqr = posB.x * posB.x + posB.y * posB.y + posB.z * posB.z;
    const cPosSqr = posC.x * posC.x + posC.y * posC.y + posC.z * posC.z;
    const dPosSqr = posD.x * posD.x + posD.y * posD.y + posD.z * posD.z;

    const matrixDx = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    const matrixDy = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    const matrixDz = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [1, 1, 1, 1],
    ]);

    const matrixC = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
    ]);

    const a = matrixA.determinant;
    const Dx = matrixDx.determinant;
    const Dy = -matrixDy.determinant;
    const Dz = matrixDz.determinant;
    const c = matrixC.determinant;

    this.circumcenter = new Vector3(Dx / (2 * a), Dy / (2 * a), Dz / (2 * a));

    this.circumradiusSquared =
      (Dx * Dx + Dy * Dy + Dz * Dz - 4 * a * c) / (4 * a * a);
  }

  containsVertex(vertex: Vertex): boolean {
    return (
      Delaunay3D.almostEqual(vertex, this.a) ||
      Delaunay3D.almostEqual(vertex, this.b) ||
      Delaunay3D.almostEqual(vertex, this.c) ||
      Delaunay3D.almostEqual(vertex, this.d)
    );
  }

  circumsphereContains(point: Vector3): boolean {
    if (!this.circumcenter || this.circumradiusSquared === undefined) {
      return false;
    }

    const distance = new Vector3(
      point.x - this.circumcenter.x,
      point.y - this.circumcenter.y,
      point.z - this.circumcenter.z
    );
    const distSqr =
      distance.x * distance.x +
      distance.y * distance.y +
      distance.z * distance.z;
    return distSqr <= this.circumradiusSquared;
  }

  equals(other: DelaunayTetrahedron): boolean {
    return (
      (Delaunay3D.almostEqual(this.a, other.a) ||
        Delaunay3D.almostEqual(this.a, other.b) ||
        Delaunay3D.almostEqual(this.a, other.c) ||
        Delaunay3D.almostEqual(this.a, other.d)) &&
      (Delaunay3D.almostEqual(this.b, other.a) ||
        Delaunay3D.almostEqual(this.b, other.b) ||
        Delaunay3D.almostEqual(this.b, other.c) ||
        Delaunay3D.almostEqual(this.b, other.d)) &&
      (Delaunay3D.almostEqual(this.c, other.a) ||
        Delaunay3D.almostEqual(this.c, other.b) ||
        Delaunay3D.almostEqual(this.c, other.c) ||
        Delaunay3D.almostEqual(this.c, other.d)) &&
      (Delaunay3D.almostEqual(this.d, other.a) ||
        Delaunay3D.almostEqual(this.d, other.b) ||
        Delaunay3D.almostEqual(this.d, other.c) ||
        Delaunay3D.almostEqual(this.d, other.d))
    );
  }
}

class Delaunay3D {
  public vertices: Vertex[] = [];
  public edges: Edge[] = [];
  public triangles: Triangle[] = [];
  public tetrahedra: DelaunayTetrahedron[] = [];

  private constructor() {}

  static almostEqual(left: Vertex, right: Vertex): boolean {
    const dx = left.position.x - right.position.x;
    const dy = left.position.y - right.position.y;
    const dz = left.position.z - right.position.z;
    return dx * dx + dy * dy + dz * dz < 0.01;
  }

  static triangulate(vertices: Vertex[]): Delaunay3D {
    const delaunay = new Delaunay3D();

    delaunay.vertices = [...vertices];

    if (vertices.length < 4) {
      console.warn("Need at least 4 vertices for 3D triangulation");
      return delaunay;
    }

    delaunay.triangulate();
    return delaunay;
  }

  private triangulate(): void {
    let minX = this.vertices[0].position.x;
    let minY = this.vertices[0].position.y;
    let minZ = this.vertices[0].position.z;
    let maxX = minX;
    let maxY = minY;
    let maxZ = minZ;

    for (const vertex of this.vertices) {
      const pos = vertex.position;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      maxZ = Math.max(maxZ, pos.z);
    }

    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    const deltaMax = Math.max(dx, dy, dz) * 2;

    const p1 = new Vertex(new Vector3(minX - 1, minY - 1, minZ - 1));
    const p2 = new Vertex(new Vector3(maxX + deltaMax, minY - 1, minZ - 1));
    const p3 = new Vertex(new Vector3(minX - 1, maxY + deltaMax, minZ - 1));
    const p4 = new Vertex(new Vector3(minX - 1, minY - 1, maxZ + deltaMax));

    this.tetrahedra.push(new DelaunayTetrahedron(p1, p2, p3, p4));

    for (const vertex of this.vertices) {
      const triangles: DelaunayTriangle[] = [];

      for (const tetra of this.tetrahedra) {
        if (tetra.circumsphereContains(vertex.position)) {
          tetra.isBad = true;

          triangles.push(new DelaunayTriangle(tetra.a, tetra.b, tetra.c));
          triangles.push(new DelaunayTriangle(tetra.a, tetra.b, tetra.d));
          triangles.push(new DelaunayTriangle(tetra.a, tetra.c, tetra.d));
          triangles.push(new DelaunayTriangle(tetra.b, tetra.c, tetra.d));
        }
      }

      this.tetrahedra = this.tetrahedra.filter((t) => !t.isBad);

      for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
          if (DelaunayTriangle.almostEqual(triangles[i], triangles[j])) {
            triangles[i].isBad = true;
            triangles[j].isBad = true;
          }
        }
      }

      const goodTriangles = triangles.filter((t) => !t.isBad);

      for (const triangle of goodTriangles) {
        this.tetrahedra.push(
          new DelaunayTetrahedron(triangle.u, triangle.v, triangle.w, vertex)
        );
      }
    }

    this.tetrahedra = this.tetrahedra.filter(
      (tetra) =>
        !tetra.containsVertex(p1) &&
        !tetra.containsVertex(p2) &&
        !tetra.containsVertex(p3) &&
        !tetra.containsVertex(p4)
    );

    const triangleSet = new Set<string>();
    const edgeSet = new Set<string>();

    for (const tetra of this.tetrahedra) {
      const faces = [
        new DelaunayTriangle(tetra.a, tetra.b, tetra.c),
        new DelaunayTriangle(tetra.a, tetra.b, tetra.d),
        new DelaunayTriangle(tetra.a, tetra.c, tetra.d),
        new DelaunayTriangle(tetra.b, tetra.c, tetra.d),
      ];

      for (const face of faces) {
        const hash = `${face.u.getHashCode()},${face.v.getHashCode()},${face.w.getHashCode()}`;
        if (!triangleSet.has(hash)) {
          triangleSet.add(hash);
          this.triangles.push(new Triangle(face.u, face.v, face.w));
        }
      }

      const edges = [
        new DelaunayEdge(tetra.a, tetra.b),
        new DelaunayEdge(tetra.b, tetra.c),
        new DelaunayEdge(tetra.c, tetra.a),
        new DelaunayEdge(tetra.d, tetra.a),
        new DelaunayEdge(tetra.d, tetra.b),
        new DelaunayEdge(tetra.d, tetra.c),
      ];

      for (const edge of edges) {
        const hash1 = `${edge.u.getHashCode()},${edge.v.getHashCode()}`;
        const hash2 = `${edge.v.getHashCode()},${edge.u.getHashCode()}`;
        if (!edgeSet.has(hash1) && !edgeSet.has(hash2)) {
          edgeSet.add(hash1);
          this.edges.push(new Edge(edge.u, edge.v));
        }
      }
    }
  }
}

class DelaunayTriangle {
  public isBad: boolean = false;

  constructor(public u: Vertex, public v: Vertex, public w: Vertex) {}

  static almostEqual(left: DelaunayTriangle, right: DelaunayTriangle): boolean {
    return (
      (Delaunay3D.almostEqual(left.u, right.u) ||
        Delaunay3D.almostEqual(left.u, right.v) ||
        Delaunay3D.almostEqual(left.u, right.w)) &&
      (Delaunay3D.almostEqual(left.v, right.u) ||
        Delaunay3D.almostEqual(left.v, right.v) ||
        Delaunay3D.almostEqual(left.v, right.w)) &&
      (Delaunay3D.almostEqual(left.w, right.u) ||
        Delaunay3D.almostEqual(left.w, right.v) ||
        Delaunay3D.almostEqual(left.w, right.w))
    );
  }
}

class DelaunayEdge {
  public isBad: boolean = false;

  constructor(public u: Vertex, public v: Vertex) {}

  static almostEqual(left: DelaunayEdge, right: DelaunayEdge): boolean {
    return (
      (Delaunay3D.almostEqual(left.u, right.u) &&
        Delaunay3D.almostEqual(left.v, right.v)) ||
      (Delaunay3D.almostEqual(left.u, right.v) &&
        Delaunay3D.almostEqual(left.v, right.u))
    );
  }
}

export {
  Delaunay3D,
  DelaunayTetrahedron,
  DelaunayTriangle,
  DelaunayEdge,
  Matrix4x4,
};
