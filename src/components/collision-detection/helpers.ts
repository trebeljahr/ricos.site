import { Polygon } from "../../lib/math/Poly";
import { Vector2 } from "../../lib/math/vector";
import {
  drawProjection,
  getRotationMatrix,
  getTranslationMatrix,
  line,
} from "../../lib/math/drawHelpers";

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vector2,
  to: Vector2,
  arrowHeadLength = 20
) {
  const dir = from.sub(to).perp().unit().multScalar(arrowHeadLength);

  const arrow1 = dir
    .copy()
    .transform(getTranslationMatrix(to.x, to.y))
    .transform(getRotationMatrix(20, to));

  const arrow2 = dir
    .copy()
    .multScalar(-1)
    .transform(getTranslationMatrix(to.x, to.y))
    .transform(getRotationMatrix(-20, to));

  line(ctx, from, to);
  line(ctx, to, arrow1);
  line(ctx, to, arrow2);
}

function flattenPointsOn(points: Vector2[], axis: Vector2): Projection {
  let min = Number.MAX_VALUE;
  let max = -Number.MAX_VALUE;
  for (let point of points) {
    const dot = point.dot(axis);
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

function isSeparatingAxis(
  axis: Vector2,
  pointsA: Vector2[],
  pointsB: Vector2[]
) {
  const rangeA = flattenPointsOn(pointsA, axis);
  const rangeB = flattenPointsOn(pointsB, axis);

  const separating = rangeA.min > rangeB.max || rangeB.min > rangeA.max;

  if (separating) {
    return true;
  }

  return false;
}

type Projection = {
  max: number;
  min: number;
};

export function drawAllProjections(
  ctx: CanvasRenderingContext2D,
  poly1: Polygon,
  poly2: Polygon
) {
  let normals = [...poly1.edgeNormals(), ...poly2.edgeNormals()];

  normals.forEach((e) => {
    let p1 = new Vector2(e.x, e.y);
    let p2 = p1.multScalar(-1);

    drawProjection(ctx, [poly1, poly2], p1, p2);
  });
}

export function checkCollision(poly1: Polygon, poly2: Polygon) {
  for (let normal of poly1.edgeNormals()) {
    if (isSeparatingAxis(normal, poly1.vertices, poly2.vertices)) {
      return false;
    }
  }

  for (let normal of poly2.edgeNormals()) {
    if (isSeparatingAxis(normal, poly1.vertices, poly2.vertices)) {
      return false;
    }
  }

  return true;
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
  const [w, h] = [
    parseFloat(ctx.canvas.style.width),
    parseFloat(ctx.canvas.style.height),
  ];

  ctx.fillStyle = "rgb(240, 240, 240)";
  ctx.fillRect(0, 0, w, h);

  // ctx.strokeStyle = "red";
  // line(ctx, 0, h / 2, w, h / 2);
  // line(ctx, w / 2, 0, w / 2, h);
}

export function colorEdge(
  ctx: CanvasRenderingContext2D,
  p1: Vector2,
  p2: Vector2
) {
  ctx.save();
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 5;
  line(ctx, p1, p2);
  ctx.restore();
}
