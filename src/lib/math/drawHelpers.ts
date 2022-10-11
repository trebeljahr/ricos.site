import { Matrix } from "./matrix";
import { Vector2 } from "./vector";

export const toDegrees = (radians: number) => (radians * 180) / Math.PI;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);

export function getSupportPoint(vertices: Vector2[], d: Vector2) {
  let highest = -Infinity;
  let support = new Vector2(0, 0);

  for (let vertex of vertices) {
    const dot = vertex.dot(d);

    if (dot > highest) {
      highest = dot;
      support = vertex;
    }
  }

  return support;
}

export function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

export function getTranslationMatrix(x: number, y: number) {
  return new Matrix([
    [1, 0, x],
    [0, 1, y],
    [0, 0, 1],
  ]);
}

const sin = Math.sin;
const cos = Math.cos;

export function getRotationMatrix(
  θ: number,
  { x, y }: Vector2 = new Vector2(0, 0)
) {
  return new Matrix([
    [cos(θ), -1 * sin(θ), -x * cos(θ) + y * sin(θ) + x],
    [sin(θ), cos(θ), -x * sin(θ) - y * cos(θ) + y],
    [0, 0, 1],
  ]);
}

export function circle(ctx: CanvasRenderingContext2D, p: Vector2, d: number) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, d, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();
}
