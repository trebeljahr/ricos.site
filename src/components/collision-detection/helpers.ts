import Layout from "../layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon } from "../../lib/math/rect";
import { Vector2 } from "../../lib/math/vector";
import { drawProjection, line } from "../../lib/math/drawHelpers";

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
  cnv: HTMLCanvasElement,
  poly1: Polygon,
  poly2: Polygon
) {
  let ctx = cnv.getContext("2d");
  if (!ctx) return;

  let normals = [...poly1.edgeNormals(), ...poly2.edgeNormals()];

  normals.forEach((e) => {
    if (!ctx) return;
    let p1 = new Vector2(e.x, e.y);
    let p2 = p1.multScalar(-1);

    drawProjection(cnv, [poly1, poly2], p1, p2);
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
  const [w, h] = [ctx.canvas.width, ctx.canvas.height];

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
  line(ctx, p1.x, p1.y, p2.x, p2.y);
  ctx.restore();
}
