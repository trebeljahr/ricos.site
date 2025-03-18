import { Vector3 } from "./Types";

class Vertex {
  constructor(public position: Vector3, public data: any = null) {}

  equals(other: Vertex): boolean {
    return (
      this.position.x === other.position.x &&
      this.position.y === other.position.y &&
      this.position.z === other.position.z
    );
  }

  getHashCode(): number {
    return (
      ((this.position.x * 73856093) ^
        (this.position.y * 19349663) ^
        (this.position.z * 83492791)) |
      0
    );
  }

  static almostEqual(a: Vertex, b: Vertex): boolean {
    const epsilon = 0.01;
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    return (
      Math.abs(dx) < epsilon && Math.abs(dy) < epsilon && Math.abs(dz) < epsilon
    );
  }
}

class VertexWithData<T> extends Vertex {
  constructor(position: Vector3, public item: T) {
    super(position, item);
  }
}

class Edge {
  constructor(public u: Vertex, public v: Vertex) {}

  get distance(): number {
    return this.u.position.distance(this.v.position);
  }

  equals(other: Edge): boolean {
    return (
      (this.u.equals(other.u) && this.v.equals(other.v)) ||
      (this.u.equals(other.v) && this.v.equals(other.u))
    );
  }

  static almostEqual(a: Edge, b: Edge): boolean {
    return (
      (Vertex.almostEqual(a.u, b.u) && Vertex.almostEqual(a.v, b.v)) ||
      (Vertex.almostEqual(a.u, b.v) && Vertex.almostEqual(a.v, b.u))
    );
  }

  getHashCode(): number {
    return this.u.getHashCode() ^ this.v.getHashCode();
  }
}

class DelaunayEdge extends Edge {
  public isBad: boolean = false;

  constructor(u: Vertex, v: Vertex) {
    super(u, v);
  }
}

class Triangle {
  public isBad: boolean = false;

  constructor(public u: Vertex, public v: Vertex, public w: Vertex) {}

  containsVertex(vertex: Vertex): boolean {
    return (
      Vertex.almostEqual(vertex, this.u) ||
      Vertex.almostEqual(vertex, this.v) ||
      Vertex.almostEqual(vertex, this.w)
    );
  }

  equals(other: Triangle): boolean {
    return (
      (this.u.equals(other.u) ||
        this.u.equals(other.v) ||
        this.u.equals(other.w)) &&
      (this.v.equals(other.u) ||
        this.v.equals(other.v) ||
        this.v.equals(other.w)) &&
      (this.w.equals(other.u) ||
        this.w.equals(other.v) ||
        this.w.equals(other.w))
    );
  }

  static almostEqual(a: Triangle, b: Triangle): boolean {
    return (
      (Vertex.almostEqual(a.u, b.u) ||
        Vertex.almostEqual(a.u, b.v) ||
        Vertex.almostEqual(a.u, b.w)) &&
      (Vertex.almostEqual(a.v, b.u) ||
        Vertex.almostEqual(a.v, b.v) ||
        Vertex.almostEqual(a.v, b.w)) &&
      (Vertex.almostEqual(a.w, b.u) ||
        Vertex.almostEqual(a.w, b.v) ||
        Vertex.almostEqual(a.w, b.w))
    );
  }

  getHashCode(): number {
    return this.u.getHashCode() ^ this.v.getHashCode() ^ this.w.getHashCode();
  }
}

class Tetrahedron {
  public isBad: boolean = false;
  private circumcenter: Vector3;
  private circumradiusSquared: number;

  constructor(
    public a: Vertex,
    public b: Vertex,
    public c: Vertex,
    public d: Vertex
  ) {
    this.calculateCircumsphere();
    this.circumcenter = new Vector3(0, 0, 0);
    this.circumradiusSquared = 0;
  }

  private calculateCircumsphere(): void {
    const centerX =
      (this.a.position.x +
        this.b.position.x +
        this.c.position.x +
        this.d.position.x) /
      4;
    const centerY =
      (this.a.position.y +
        this.b.position.y +
        this.c.position.y +
        this.d.position.y) /
      4;
    const centerZ =
      (this.a.position.z +
        this.b.position.z +
        this.c.position.z +
        this.d.position.z) /
      4;

    this.circumcenter = new Vector3(centerX, centerY, centerZ);

    const distA = this.a.position.subtract(this.circumcenter).sqrMagnitude();
    const distB = this.b.position.subtract(this.circumcenter).sqrMagnitude();
    const distC = this.c.position.subtract(this.circumcenter).sqrMagnitude();
    const distD = this.d.position.subtract(this.circumcenter).sqrMagnitude();

    this.circumradiusSquared = Math.max(distA, distB, distC, distD);
  }

  containsVertex(vertex: Vertex): boolean {
    return (
      Vertex.almostEqual(vertex, this.a) ||
      Vertex.almostEqual(vertex, this.b) ||
      Vertex.almostEqual(vertex, this.c) ||
      Vertex.almostEqual(vertex, this.d)
    );
  }

  circumsphereContains(point: Vector3): boolean {
    const distSquared = point.subtract(this.circumcenter).sqrMagnitude();
    return distSquared <= this.circumradiusSquared;
  }

  equals(other: Tetrahedron): boolean {
    return (
      (this.a.equals(other.a) ||
        this.a.equals(other.b) ||
        this.a.equals(other.c) ||
        this.a.equals(other.d)) &&
      (this.b.equals(other.a) ||
        this.b.equals(other.b) ||
        this.b.equals(other.c) ||
        this.b.equals(other.d)) &&
      (this.c.equals(other.a) ||
        this.c.equals(other.b) ||
        this.c.equals(other.c) ||
        this.c.equals(other.d)) &&
      (this.d.equals(other.a) ||
        this.d.equals(other.b) ||
        this.d.equals(other.c) ||
        this.d.equals(other.d))
    );
  }

  getHashCode(): number {
    return (
      this.a.getHashCode() ^
      this.b.getHashCode() ^
      this.c.getHashCode() ^
      this.d.getHashCode()
    );
  }
}

export { Vertex, VertexWithData, Edge, DelaunayEdge, Triangle, Tetrahedron };
