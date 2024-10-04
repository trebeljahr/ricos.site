import { cos, getRotationMatrix, getScalingMatrix, sin } from "./drawHelpers";
import { Matrix } from "./matrix";

const precision = 0.000001;
export class Vec2 {
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
    return this.dot(this);
  }

  divScalar(scalar: number) {
    return new Vec2(this.x / scalar, this.y / scalar);
  }

  multScalar(scalar: number) {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  projectOnLine(A: Vec2, B: Vec2) {
    const AP = this.sub(A);
    const AB = B.sub(A);
    return A.add(AB.multScalar(AP.dot(AB) / AB.mag2()));
  }

  unit() {
    return this.divScalar(this.mag());
  }

  perp() {
    return new Vec2(this.y, -this.x);
  }

  getNormal() {
    return this.perp().unit();
  }

  sub(other: Vec2) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  add(other: Vec2) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  dot(other: Vec2) {
    return this.x * other.x + this.y * other.y;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  transform(matrix: Matrix) {
    const newX = matrix.a * this.x + matrix.b * this.y + matrix.c;
    const newY = matrix.d * this.x + matrix.e * this.y + matrix.f;
    this.x = newX;
    this.y = newY;
    return this;
  }

  rotate(θ: number) {
    const newX = cos(θ) * this.x - sin(θ) * this.y;
    const newY = sin(θ) * this.x - cos(θ) * this.y;
    this.x = newX;
    this.y = newY;
    return this;
  }

  scale(amt: number) {
    return this.transform(getScalingMatrix(amt, amt));
  }

  equals(other: Vec2) {
    return (
      Math.abs(other.x - this.x) < precision &&
      Math.abs(other.y - this.y) < precision
    );
  }

  perpDot(other: Vec2) {
    return this.perp().dot(other);
  }

  *[Symbol.iterator](): IterableIterator<number> {
    yield this.x;
    yield this.y;
  }
}
