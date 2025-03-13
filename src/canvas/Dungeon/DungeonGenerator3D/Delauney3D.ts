import { Edge, Triangle, Vertex } from "./GraphStructures";
import { Vector3 } from "./Types";

class Matrix4x4 {
  private elements: number[][];

  constructor(rows: number[][]) {
    this.elements = rows;
  }

  /**
   * Calculate the determinant of this 4x4 matrix
   * @returns Determinant value
   */
  get determinant(): number {
    // Implementation of 4x4 determinant using cofactor expansion
    const [
      [m00, m01, m02, m03],
      [m10, m11, m12, m13],
      [m20, m21, m22, m23],
      [m30, m31, m32, m33],
    ] = this.elements;

    // Calculate determinants of 3x3 minors
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

    // Apply cofactor expansion
    return (
      m00 * det3_123_123 -
      m10 * det3_123_023 +
      m20 * det3_123_013 -
      m30 * det3_123_012
    );
  }

  /**
   * Create a 4x4 matrix from column vectors
   * @param col0 First column
   * @param col1 Second column
   * @param col2 Third column
   * @param col3 Fourth column
   * @returns New matrix
   */
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

/**
 * Improved Tetrahedron with accurate circumsphere calculation
 */
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

  /**
   * Calculate the circumsphere of the tetrahedron
   * Direct port of the C# implementation
   */
  private calculateCircumsphere(): void {
    // Create the matrices as described in the original implementation
    // Based on: http://mathworld.wolfram.com/Circumsphere.html

    const posA = this.a.position;
    const posB = this.b.position;
    const posC = this.c.position;
    const posD = this.d.position;

    // Matrix for 'a' coefficient
    const matrixA = new Matrix4x4([
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    // Calculate squared magnitudes
    const aPosSqr = posA.x * posA.x + posA.y * posA.y + posA.z * posA.z;
    const bPosSqr = posB.x * posB.x + posB.y * posB.y + posB.z * posB.z;
    const cPosSqr = posC.x * posC.x + posC.y * posC.y + posC.z * posC.z;
    const dPosSqr = posD.x * posD.x + posD.y * posD.y + posD.z * posD.z;

    // Matrix for Dx coefficient
    const matrixDx = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    // Matrix for Dy coefficient (note the negative sign)
    const matrixDy = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.z, posB.z, posC.z, posD.z],
      [1, 1, 1, 1],
    ]);

    // Matrix for Dz coefficient
    const matrixDz = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [1, 1, 1, 1],
    ]);

    // Matrix for c coefficient
    const matrixC = new Matrix4x4([
      [aPosSqr, bPosSqr, cPosSqr, dPosSqr],
      [posA.x, posB.x, posC.x, posD.x],
      [posA.y, posB.y, posC.y, posD.y],
      [posA.z, posB.z, posC.z, posD.z],
    ]);

    // Calculate determinants
    const a = matrixA.determinant;
    const Dx = matrixDx.determinant;
    const Dy = -matrixDy.determinant; // Note the negative sign
    const Dz = matrixDz.determinant;
    const c = matrixC.determinant;

    // Calculate circumcenter
    this.circumcenter = new Vector3(Dx / (2 * a), Dy / (2 * a), Dz / (2 * a));

    // Calculate squared radius
    this.circumradiusSquared =
      (Dx * Dx + Dy * Dy + Dz * Dz - 4 * a * c) / (4 * a * a);
  }

  /**
   * Check if a vertex is one of the tetrahedron vertices
   * @param vertex Vertex to check
   * @returns True if vertex is part of the tetrahedron
   */
  containsVertex(vertex: Vertex): boolean {
    return (
      Delaunay3D.almostEqual(vertex, this.a) ||
      Delaunay3D.almostEqual(vertex, this.b) ||
      Delaunay3D.almostEqual(vertex, this.c) ||
      Delaunay3D.almostEqual(vertex, this.d)
    );
  }

  /**
   * Check if a point is inside the circumsphere
   * @param point Point to check
   * @returns True if the point is inside the circumsphere
   */
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

  /**
   * Check if this tetrahedron equals another
   * @param other Tetrahedron to compare with
   * @returns True if tetrahedra have the same vertices
   */
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

/**
 * Improved Delaunay triangulation in 3D
 * Direct port of the C# implementation
 */
class Delaunay3D {
  public vertices: Vertex[] = [];
  public edges: Edge[] = [];
  public triangles: Triangle[] = [];
  public tetrahedra: DelaunayTetrahedron[] = [];

  private constructor() {}

  /**
   * Check if two vertices are almost equal (within epsilon)
   * @param left First vertex
   * @param right Second vertex
   * @returns True if vertices are close enough
   */
  static almostEqual(left: Vertex, right: Vertex): boolean {
    const dx = left.position.x - right.position.x;
    const dy = left.position.y - right.position.y;
    const dz = left.position.z - right.position.z;
    return dx * dx + dy * dy + dz * dz < 0.01;
  }

  /**
   * Triangulate a set of vertices
   * @param vertices Array of vertices to triangulate
   * @returns A new Delaunay3D instance
   */
  static triangulate(vertices: Vertex[]): Delaunay3D {
    const delaunay = new Delaunay3D();

    // Create a copy of the vertices
    delaunay.vertices = [...vertices];

    // If we have fewer than 4 vertices, we can't create a tetrahedron
    if (vertices.length < 4) {
      console.warn("Need at least 4 vertices for 3D triangulation");
      return delaunay;
    }

    delaunay.triangulate();
    return delaunay;
  }

  /**
   * Perform the triangulation
   */
  private triangulate(): void {
    // Find the bounding box
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

    // Calculate the maximum delta for the super-tetrahedron
    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    const deltaMax = Math.max(dx, dy, dz) * 2;

    // Create the super-tetrahedron vertices
    const p1 = new Vertex(new Vector3(minX - 1, minY - 1, minZ - 1));
    const p2 = new Vertex(new Vector3(maxX + deltaMax, minY - 1, minZ - 1));
    const p3 = new Vertex(new Vector3(minX - 1, maxY + deltaMax, minZ - 1));
    const p4 = new Vertex(new Vector3(minX - 1, minY - 1, maxZ + deltaMax));

    // Add the super-tetrahedron
    this.tetrahedra.push(new DelaunayTetrahedron(p1, p2, p3, p4));

    // Incrementally add each vertex to the triangulation
    for (const vertex of this.vertices) {
      const triangles: DelaunayTriangle[] = [];

      // Find all tetrahedra that need to be removed
      for (const tetra of this.tetrahedra) {
        if (tetra.circumsphereContains(vertex.position)) {
          tetra.isBad = true;

          // Add the faces of the tetrahedron
          triangles.push(new DelaunayTriangle(tetra.a, tetra.b, tetra.c));
          triangles.push(new DelaunayTriangle(tetra.a, tetra.b, tetra.d));
          triangles.push(new DelaunayTriangle(tetra.a, tetra.c, tetra.d));
          triangles.push(new DelaunayTriangle(tetra.b, tetra.c, tetra.d));
        }
      }

      // Remove bad tetrahedra
      this.tetrahedra = this.tetrahedra.filter((t) => !t.isBad);

      // Find unique triangles
      // Mark triangles as bad if they appear more than once (interior faces)
      for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
          if (DelaunayTriangle.almostEqual(triangles[i], triangles[j])) {
            triangles[i].isBad = true;
            triangles[j].isBad = true;
          }
        }
      }

      // Keep only the good triangles
      const goodTriangles = triangles.filter((t) => !t.isBad);

      // Create new tetrahedra from the good triangles and the current vertex
      for (const triangle of goodTriangles) {
        this.tetrahedra.push(
          new DelaunayTetrahedron(triangle.u, triangle.v, triangle.w, vertex)
        );
      }
    }

    // Remove tetrahedra with vertices from the super-tetrahedron
    this.tetrahedra = this.tetrahedra.filter(
      (tetra) =>
        !tetra.containsVertex(p1) &&
        !tetra.containsVertex(p2) &&
        !tetra.containsVertex(p3) &&
        !tetra.containsVertex(p4)
    );

    // Extract triangles and edges from the tetrahedra
    const triangleSet = new Set<string>();
    const edgeSet = new Set<string>();

    for (const tetra of this.tetrahedra) {
      // Create the four triangular faces
      const faces = [
        new DelaunayTriangle(tetra.a, tetra.b, tetra.c),
        new DelaunayTriangle(tetra.a, tetra.b, tetra.d),
        new DelaunayTriangle(tetra.a, tetra.c, tetra.d),
        new DelaunayTriangle(tetra.b, tetra.c, tetra.d),
      ];

      // Add unique triangles
      for (const face of faces) {
        const hash = `${face.u.getHashCode()},${face.v.getHashCode()},${face.w.getHashCode()}`;
        if (!triangleSet.has(hash)) {
          triangleSet.add(hash);
          this.triangles.push(new Triangle(face.u, face.v, face.w));
        }
      }

      // Create the six edges
      const edges = [
        new DelaunayEdge(tetra.a, tetra.b),
        new DelaunayEdge(tetra.b, tetra.c),
        new DelaunayEdge(tetra.c, tetra.a),
        new DelaunayEdge(tetra.d, tetra.a),
        new DelaunayEdge(tetra.d, tetra.b),
        new DelaunayEdge(tetra.d, tetra.c),
      ];

      // Add unique edges
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

/**
 * Triangle class for Delaunay algorithm
 */
class DelaunayTriangle {
  public isBad: boolean = false;

  constructor(public u: Vertex, public v: Vertex, public w: Vertex) {}

  /**
   * Check if this triangle is almost equal to another
   * @param left First triangle
   * @param right Second triangle
   * @returns True if triangles have the same vertices (in any order)
   */
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

/**
 * Edge class for Delaunay algorithm
 */
class DelaunayEdge {
  public isBad: boolean = false;

  constructor(public u: Vertex, public v: Vertex) {}

  /**
   * Check if this edge is almost equal to another
   * @param left First edge
   * @param right Second edge
   * @returns True if edges have the same vertices (in any order)
   */
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
