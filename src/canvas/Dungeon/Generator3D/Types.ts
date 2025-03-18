export enum CellType3D {
  None,
  Room,
  Hallway,
  RoomCenterAxis,
  Stairs,
}

export class Room3D {
  public bounds: BoundsInt3D;

  constructor(location: Vector3Int, size: Vector3Int) {
    this.bounds = new BoundsInt3D(location, size);
  }

  containsPoint(point: Vector3Int): boolean {
    return this.bounds.contains(point);
  }

  static intersect(a: Room3D, b: Room3D): boolean {
    return !(
      a.bounds.xMin >= b.bounds.xMax ||
      a.bounds.xMax <= b.bounds.xMin ||
      a.bounds.yMin >= b.bounds.yMax ||
      a.bounds.yMax <= b.bounds.yMin ||
      a.bounds.zMin >= b.bounds.zMax ||
      a.bounds.zMax <= b.bounds.zMin
    );
  }

  toString(): string {
    return `Room at ${this.bounds.position.toString()} with size ${this.bounds.size.toString()}`;
  }
}

export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number): Vector3 {
    return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  distance(other: Vector3): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  sqrMagnitude(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  magnitude(): number {
    return Math.sqrt(this.sqrMagnitude());
  }

  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return this.divide(mag);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
}

export class Vector3Int {
  constructor(public x: number, public y: number, public z: number) {}

  static zero(): Vector3Int {
    return new Vector3Int(0, 0, 0);
  }

  add(other: Vector3Int): Vector3Int {
    return new Vector3Int(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3Int): Vector3Int {
    return new Vector3Int(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiply(scalar: number): Vector3Int {
    return new Vector3Int(
      Math.floor(this.x * scalar),
      Math.floor(this.y * scalar),
      Math.floor(this.z * scalar)
    );
  }

  static distance(a: Vector3Int, b: Vector3Int): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  equals(other: Vector3Int): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }

  toVector3(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  static fromVector3(v: Vector3): Vector3Int {
    return new Vector3Int(Math.floor(v.x), Math.floor(v.y), Math.floor(v.z));
  }

  clone(): Vector3Int {
    return new Vector3Int(this.x, this.y, this.z);
  }
}

export class BoundsInt3D {
  constructor(public position: Vector3Int, public size: Vector3Int) {}

  get xMin(): number {
    return this.position.x;
  }
  get xMax(): number {
    return this.position.x + this.size.x;
  }
  get yMin(): number {
    return this.position.y;
  }
  get yMax(): number {
    return this.position.y + this.size.y;
  }
  get zMin(): number {
    return this.position.z;
  }
  get zMax(): number {
    return this.position.z + this.size.z;
  }

  get center(): Vector3 {
    return new Vector3(
      Math.floor(this.position.x + this.size.x / 2),
      Math.floor(this.position.y + this.size.y / 2),
      Math.floor(this.position.z + this.size.z / 2)
    );
  }

  contains(point: Vector3Int): boolean {
    return (
      point.x >= this.xMin &&
      point.x < this.xMax &&
      point.y >= this.yMin &&
      point.y < this.yMax &&
      point.z >= this.zMin &&
      point.z < this.zMax
    );
  }

  *allPositionsWithin(): Generator<Vector3Int> {
    for (let x = this.xMin; x < this.xMax; x++) {
      for (let y = this.yMin; y < this.yMax; y++) {
        for (let z = this.zMin; z < this.zMax; z++) {
          yield new Vector3Int(x, y, z);
        }
      }
    }
  }
}

export class Mathf {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static max(...values: number[]): number {
    return Math.max(...values);
  }

  static min(...values: number[]): number {
    return Math.min(...values);
  }

  static abs(value: number): number {
    return Math.abs(value);
  }
}
