import { Rect, Polygon } from "./rect";
import { Matrix } from "./matrix";
import { Vector2 } from "./vector";

export const toDegrees = (radians: number) => (radians * 180) / Math.PI;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);

export function getProjectionMatrix(v: Vector2) {
  const u = v.unit();
  return new Matrix([
    [u.x * u.x, u.x * u.y, 0],
    [u.x * u.y, u.y * u.y, 0],
    [0, 0, 1],
  ]);
}

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

export function insidePoly({ x, y }: Vector2, vertices: Vector2[]) {
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;

    const intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function drawProjection(
  cnv: HTMLCanvasElement,
  poly: Polygon,
  p1: Vector2,
  p2: Vector2
) {
  const ctx = cnv.getContext("2d");
  if (!ctx) return;

  const origin = new Vector2(cnv.width / 2, cnv.height / 2);
  const toOrigin = getTranslationMatrix(origin.x, origin.y);

  const d1 = p1.sub(p2);
  const d2 = p2.sub(p1);

  const len = Math.max(cnv.width, cnv.height);
  const l1 = d2.unit().multScalar(len).transform(toOrigin);
  const l2 = d2.unit().multScalar(-len).transform(toOrigin);

  ctx.strokeStyle = "black";
  line(ctx, l2.x, l2.y, l1.x, l1.y);

  const s1 = getSupportPoint(poly.vertices, d1);
  const s2 = getSupportPoint(poly.vertices, d2);

  const projectedS1 = s1.projectOnLine(l1, l2);
  const projectedS2 = s2.projectOnLine(l1, l2);

  ctx.save();
  ctx.setLineDash([5, 15]);
  ctx.strokeStyle = "rgb(150, 150, 150)";
  line(ctx, s1.x, s1.y, projectedS1.x, projectedS1.y);
  line(ctx, s2.x, s2.y, projectedS2.x, projectedS2.y);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = poly.color;
  circle(ctx, projectedS1, 5);
  circle(ctx, projectedS2, 5);
  ctx.strokeStyle = poly.color;
  ctx.lineWidth = 3;
  line(ctx, projectedS1.x, projectedS1.y, projectedS2.x, projectedS2.y);
  ctx.restore();
}

export function getScalingMatrix(x: number, y: number) {
  return new Matrix([
    [x, 0, 0],
    [0, y, 0],
    [0, 0, 1],
  ]);
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

export type State = {
  draggedPoly: Polygon | null;
  selectedPoly: Polygon | null;
  rotationChange: number;
};

export function instrument(
  cnv: HTMLCanvasElement,
  polys: Polygon[],
  state: State
) {
  const updateMousePos = (event: MouseEvent) => {
    if (!state.draggedPoly) return;
    state.draggedPoly.transform(
      getTranslationMatrix(event.movementX, event.movementY)
    );
  };

  const handleMouseDown = (event: MouseEvent) => {
    const mousePos = new Vector2(event.offsetX, event.offsetY);
    for (let poly of polys) {
      if (insidePoly(mousePos, poly.vertices)) {
        state.draggedPoly = poly;
        state.selectedPoly = poly;
        return;
      }
    }

    state.selectedPoly = null;
  };

  const handleMouseUp = () => {
    state.draggedPoly = null;
  };

  const handleRotation = (event: KeyboardEvent) => {
    if (state.selectedPoly) {
      switch (event.code) {
        case "KeyA":
          state.rotationChange = 1;
          break;
        case "KeyD":
          state.rotationChange = -1;
          break;
      }
    }
  };

  const stopRotation = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyA":
        if (state.rotationChange === 1) state.rotationChange = 0;
        break;
      case "KeyD":
        if (state.rotationChange === -1) state.rotationChange = 0;
        break;
    }
  };

  cnv.addEventListener("keyup", stopRotation);
  cnv.addEventListener("keydown", handleRotation);
  cnv.addEventListener("mousemove", updateMousePos);
  cnv.addEventListener("mousedown", handleMouseDown);
  cnv.addEventListener("mouseup", handleMouseUp);

  return () => {
    cnv.removeEventListener("keyup", stopRotation);
    cnv.removeEventListener("keydown", handleRotation);
    cnv.removeEventListener("mousemove", updateMousePos);
    cnv.removeEventListener("mousedown", handleMouseDown);
    cnv.removeEventListener("mouseup", handleMouseUp);
  };
}
