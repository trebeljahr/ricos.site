import { Matrix } from "./matrix";
export class Vector2 {
  public x: number;
  public y: number;
  public z: number;
  public components: [number, number, number];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.z = 1;
    this.components = [x, y, this.z];
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
