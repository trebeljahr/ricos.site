import { Matrix } from "./matrix";
export class Vector2 {
  public components: [number, number, number];

  constructor(x: number, y: number) {
    this.components = [x, y, 1];
  }

  get x() {
    return this.components[0];
  }
  set x(newX: number) {
    this.components[0] = newX;
  }
  get y() {
    return this.components[1];
  }
  set y(newY: number) {
    this.components[1] = newY;
  }

  mag() {
    return Math.sqrt(this.mag2());
  }

  mag2() {
    // this.dot(this) is equal to => this.x² + this.y²
    return this.dot(this);
  }

  divScalar(scalar: number) {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  multScalar(scalar: number) {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  projectOnLine(A: Vector2, B: Vector2) {
    // https://gamedev.stackexchange.com/a/72529/163341
    // A + (dot(AP, AB) / dot(AB, AB)) * AB;
    const AP = this.sub(A);
    const AB = B.sub(A);
    return A.add(AB.multScalar(AP.dot(AB) / AB.mag2()));
  }

  unit() {
    return this.divScalar(this.mag());
  }

  perp() {
    return new Vector2(this.y, -this.x);
  }

  getNormal() {
    return this.perp().unit();
  }

  sub(other: Vector2) {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  add(other: Vector2) {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  dot(other: Vector2) {
    return this.x * other.x + this.y * other.y;
  }

  transform(matrix: Matrix) {
    const columns = matrix.columns();
    if (columns.length !== this.components.length) {
      throw new Error(
        "Matrix columns length should be equal to vector components length."
      );
    }

    const newX = matrix.a * this.x + matrix.b * this.y + matrix.c;
    const newY = matrix.d * this.x + matrix.e * this.y + matrix.f;
    this.x = newX;
    this.y = newY;
    return this;
  }

  *[Symbol.iterator](): IterableIterator<number> {
    yield this.x;
    yield this.y;
  }
}
