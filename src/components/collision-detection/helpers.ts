import { Polygon } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/vector";
import {
  drawInfiniteLine,
  drawProjection,
  getRotationMatrix,
  getScalingMatrix,
  getTranslationMatrix,
  line,
} from "../../lib/math/drawHelpers";

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  to: Vec2,
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

  ctx.save();
  ctx.lineWidth = 3;
  line(ctx, from, to);
  line(ctx, to, arrow1);
  line(ctx, to, arrow2);
  ctx.restore();
}

function flattenPointsOn(points: Vec2[], axis: Vec2): Projection {
  let min = Number.MAX_VALUE;
  let max = -Number.MAX_VALUE;
  for (let point of points) {
    const dot = point.dot(axis);
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

function isSeparatingAxis(axis: Vec2, pointsA: Vec2[], pointsB: Vec2[]) {
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
    let p1 = new Vec2(e.x, e.y);
    let p2 = p1.multScalar(-1);

    drawProjection(ctx, [poly1, poly2], p1, p2);
  });
}

export function getWidthAndHeight(ctx: CanvasRenderingContext2D) {
  return [
    parseFloat(ctx.canvas.style.width),
    parseFloat(ctx.canvas.style.height),
  ];
}
export function drawCoordinateSystem(
  ctx: CanvasRenderingContext2D,
  scaleFactor: number
) {
  const [w, h] = getWidthAndHeight(ctx);

  ctx.strokeStyle = "black";
  line(ctx, new Vec2(0, h / 2), new Vec2(w, h / 2));
  line(ctx, new Vec2(w / 2, 0), new Vec2(w / 2, h));
  const iterations = Math.floor(Math.max(w, h) / scaleFactor) + 1;
  for (let i = 1; i < iterations; i++) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";

    line(
      ctx,
      new Vec2(0, h / 2 + i * scaleFactor),
      new Vec2(w, h / 2 + i * scaleFactor)
    );
    line(
      ctx,
      new Vec2(w / 2 + i * scaleFactor, 0),
      new Vec2(w / 2 + i * scaleFactor, h)
    );
    line(
      ctx,
      new Vec2(0, h / 2 - i * scaleFactor),
      new Vec2(w, h / 2 - i * scaleFactor)
    );
    line(
      ctx,
      new Vec2(w / 2 - i * scaleFactor, 0),
      new Vec2(w / 2 - i * scaleFactor, h)
    );
  }
}

function getShadowOverlap(axis: Vec2, pointsA: Vec2[], pointsB: Vec2[]) {
  const rangeA = flattenPointsOn(pointsA, axis);
  const rangeB = flattenPointsOn(pointsB, axis);

  let overlap = 0;
  if (rangeA.min < rangeB.min) {
    if (rangeA.max < rangeB.max) {
      overlap = rangeA.max - rangeB.min;
    } else {
      const option1 = rangeA.max - rangeB.min;
      const option2 = rangeB.max - rangeA.min;
      overlap = option1 < option2 ? option1 : -option2;
    }
  } else {
    if (rangeA.max > rangeB.max) {
      overlap = rangeA.min - rangeB.max;
    } else {
      const option1 = rangeA.max - rangeB.min;
      const option2 = rangeB.max - rangeA.min;
      overlap = option1 < option2 ? option1 : -option2;
    }
  }

  return overlap;
}

export function visualizeCollision(
  ctx: CanvasRenderingContext2D,
  poly1: Polygon,
  poly2: Polygon,
  response = true
) {
  const responseVector = getResponseForCollision(poly1, poly2);
  const half = responseVector.multScalar(0.51);
  const halfNeg = responseVector.multScalar(-0.51);
  if (response) {
    poly1.translate(halfNeg);
    poly2.translate(half);
  } else {
    drawArrow(ctx, poly1.centroid(), poly1.centroid().add(halfNeg));
    drawArrow(ctx, poly2.centroid(), poly2.centroid().add(half));
  }
}

export function getResponseForCollision(poly1: Polygon, poly2: Polygon) {
  let smallestOverlap = Infinity;
  let axis = new Vec2(0, 0);
  for (let normal of [...poly1.edgeNormals(), ...poly2.edgeNormals()]) {
    const overlap = getShadowOverlap(normal, poly1.vertices, poly2.vertices);
    const absOverlap = Math.abs(overlap);
    if (absOverlap < Math.abs(smallestOverlap)) {
      smallestOverlap = overlap;
      axis = normal.copy();
      if (overlap < 0) {
        axis.multScalar(-1);
      }
    }
  }

  return axis.transform(getScalingMatrix(smallestOverlap, smallestOverlap));
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

export function colorEdge(ctx: CanvasRenderingContext2D, p1: Vec2, p2: Vec2) {
  ctx.save();
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 5;
  line(ctx, p1, p2);
  ctx.restore();
}
