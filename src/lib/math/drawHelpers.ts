import { Polygon } from "./Poly";
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

function onSegment(p: Vector2, q: Vector2, r: Vector2) {
  if (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  )
    return true;

  return false;
}

function doIntersect(a1: Vector2, a2: Vector2, b1: Vector2, b2: Vector2) {
  if (onSegment(a1, b1, a2)) return true;
  if (onSegment(a1, b2, a2)) return true;
  if (onSegment(b1, a1, b2)) return true;
  if (onSegment(b1, a2, b2)) return true;

  return false;
}

export function drawProjectionOnLine(
  ctx: CanvasRenderingContext2D,
  color: string,
  [projectedS1, projectedS2]: [Vector2, Vector2]
) {
  ctx.save();
  ctx.fillStyle = color;
  circle(ctx, projectedS1, 3);
  circle(ctx, projectedS2, 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  line(ctx, projectedS1.x, projectedS1.y, projectedS2.x, projectedS2.y);
  ctx.restore();
}

export function drawInfiniteLine(
  ctx: CanvasRenderingContext2D,
  p1: Vector2,
  p2: Vector2
) {
  ctx.save();
  const d = p1.sub(p2);

  const len = Math.max(ctx.canvas.width, ctx.canvas.height);
  const l1 = p1.add(d.multScalar(len));
  const l2 = p1.add(d.multScalar(-len));

  console.log(l1, l2);
  ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
  line(ctx, l2.x, l2.y, l1.x, l1.y);
  ctx.restore();
}

export function drawProjection(
  cnv: HTMLCanvasElement,
  polys: Polygon | [Polygon, Polygon],
  p1: Vector2,
  p2: Vector2
) {
  const ctx = cnv.getContext("2d");
  if (!ctx) return;

  const origin = new Vector2(cnv.width / 2, cnv.height / 2);
  const toOrigin = getTranslationMatrix(origin.x, origin.y);

  const d2 = p2.sub(p1);
  const d1 = p1.sub(p2);

  const len = Math.max(cnv.width, cnv.height);
  const l1 = d2.unit().multScalar(len).transform(toOrigin);
  const l2 = d2.unit().multScalar(-len).transform(toOrigin);

  ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
  line(ctx, l2.x, l2.y, l1.x, l1.y);

  const projectionHelper = (poly: Polygon) => {
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

    return [projectedS1, projectedS2] as [Vector2, Vector2];
  };

  if (polys instanceof Polygon) {
    const projection1 = projectionHelper(polys);
    drawProjectionOnLine(ctx, polys.color, projection1);
    return;
  }

  const [poly1, poly2] = polys;

  const projection1 = projectionHelper(poly1);
  const projection2 = projectionHelper(poly2);

  const projectionColliding = doIntersect(...projection1, ...projection2);
  const color1 = projectionColliding ? "red" : poly1.color;
  const color2 = projectionColliding ? "red" : poly2.color;

  drawProjectionOnLine(ctx, color1, projection1);
  drawProjectionOnLine(ctx, color2, projection2);
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
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, d, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();
  ctx.restore();
}

const niceBlue = "#4763ad";
const niceGreen = "#63ad47";

export function initPolygons(cnv: HTMLCanvasElement) {
  const myPoly1 = new Polygon(
    [
      [91.3853, 72.056],
      [91.0849, 56.344],
      [61.4993, 61.451],
      [51.9736, 78.969],
      [81.2159, 83.447],
    ],
    niceGreen
  );

  const myPoly2 = new Polygon(
    [
      [-2, 0],
      [-2, 1],
      [-3, 1],
      [-3, 0],
    ],
    niceBlue
  );

  const origin = new Vector2(cnv.width / 2, cnv.height / 2);
  const toOrigin = getTranslationMatrix(origin.x, origin.y);

  myPoly1.transform(getScalingMatrix(2, 2));
  myPoly1.transform(toOrigin);
  myPoly1.rotate(20);

  myPoly2.transform(getScalingMatrix(80, 80));
  myPoly2.transform(toOrigin);
  myPoly2.rotate(45);

  return [myPoly1, myPoly2] as [Polygon, Polygon];
}

export type State = {
  draggedPoly: Polygon | undefined;
  draggedPoint: Vector2 | undefined;
  rotationChange: number;
};

function handleRotations(polys: Polygon[], amount: number) {
  polys.forEach((poly) => {
    if (poly.selected) {
      poly.rotate(amount);
    }
  });
}

export function instrument(
  ctx: CanvasRenderingContext2D,
  polys: Polygon[],
  drawFn: () => void
) {
  const rotationSpeed = 3;
  let state: State = {
    draggedPoly: null,
    draggedPoint: null,
    rotationChange: 0,
  };

  const updateMousePos = (event: MouseEvent) => {
    const mousePos = new Vector2(event.offsetX, event.offsetY);

    for (let poly of polys) {
      poly.hover = false;

      if (insidePoly(mousePos, poly.vertices)) {
        poly.hover = true;
      }
      poly.hoveredVertex = poly.vertices.find((pos) => {
        return mousePos.sub(pos).mag() <= 7 || state?.draggedPoint?.equals(pos);
      });
    }
    state.draggedPoly &&
      state.draggedPoly.transform(
        getTranslationMatrix(event.movementX, event.movementY)
      );

    state.draggedPoint &&
      state.draggedPoint.transform(
        getTranslationMatrix(event.movementX, event.movementY)
      );
  };

  const handleMouseDown = (event: MouseEvent) => {
    const mousePos = new Vector2(event.offsetX, event.offsetY);
    for (let poly of polys) {
      if (poly.hoveredVertex) {
        state.draggedPoint = poly.hoveredVertex;
        return;
      }
      if (insidePoly(mousePos, poly.vertices)) {
        state.draggedPoly = poly;
        polys.forEach((poly) => (poly.selected = false));

        poly.selected = true;
        return;
      }
    }
    polys.forEach((poly) => (poly.selected = false));
  };

  const handleMouseUp = () => {
    state.draggedPoly = undefined;
    state.draggedPoint = undefined;
  };

  const handleRotation = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyA":
        state.rotationChange = rotationSpeed;
        break;
      case "KeyD":
        state.rotationChange = -rotationSpeed;
        break;
    }
  };

  const stopRotation = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyA":
        if (state.rotationChange === rotationSpeed) state.rotationChange = 0;
        break;
      case "KeyD":
        if (state.rotationChange === -rotationSpeed) state.rotationChange = 0;
        break;
    }
  };

  ctx.canvas.addEventListener("keyup", stopRotation);
  ctx.canvas.addEventListener("keydown", handleRotation);
  ctx.canvas.addEventListener("mousemove", updateMousePos);
  ctx.canvas.addEventListener("mousedown", handleMouseDown);
  ctx.canvas.addEventListener("mouseup", handleMouseUp);

  let frameId = 0;
  const loop = () => {
    frameId = requestAnimationFrame(() => {
      handleRotations(polys, state.rotationChange);
      drawFn();
      loop();
    });
  };
  loop();

  return {
    cleanup: () => {
      ctx.canvas.removeEventListener("keyup", stopRotation);
      ctx.canvas.removeEventListener("keydown", handleRotation);
      ctx.canvas.removeEventListener("mousemove", updateMousePos);
      ctx.canvas.removeEventListener("mousedown", handleMouseDown);
      ctx.canvas.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(frameId);
    },
  };
}
