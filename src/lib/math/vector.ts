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

  project(line: [Vector2, Vector2]) {
    //   double valDp = dotProduct(e1, e2);
    // // get squared length of e1
    // double len2 = e1.x * e1.x + e1.y * e1.y;
    // Point e1 = new Point(v2.x - v1.x, v2.y - v1.y);

    const other = new Vector2(line[1].x - line[0].x, line[1].y - line[0].y);

    const len2 = other.mag2();
    const val = this.dot(other);
    return new Vector2(
      other.x + (val * other.x) / len2,
      other.y + (val * other.x) / len2
    );
    // Point p = new Point((int)(v1.x + (val * e1.x) / len2),
    //                     (int)(v1.y + (val * e1.y) / len2));

    // return other.multScalar(this.dot(other) / other.mag2());
  }

  unit() {
    return this.divScalar(this.mag());
  }

  sub(other: Vector2) {
    return new Vector2(this.x - other.x, this.y - other.y);
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
