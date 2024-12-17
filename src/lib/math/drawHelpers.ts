import { Matrix } from "./matrix";
import { Polygon } from "./Poly";
import { Vec2 } from "./Vector";

export const toDegrees = (radians: number) => (radians * 180) / Math.PI;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);

export function getProjectionMatrix(v: Vec2) {
  const u = v.unit();
  return new Matrix([
    [u.x * u.x, u.x * u.y, 0],
    [u.x * u.y, u.y * u.y, 0],
    [0, 0, 1],
  ]);
}

export function getSupportPoint(vertices: Vec2[], d: Vec2) {
  let highest = -Infinity;
  let support = new Vec2(0, 0);

  for (let vertex of vertices) {
    const dot = vertex.dot(d);

    if (dot > highest) {
      highest = dot;
      support = vertex;
    }
  }

  return support;
}

export function line(ctx: CanvasRenderingContext2D, p1: Vec2, p2: Vec2) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.closePath();
}

export function insidePoly({ x, y }: Vec2, vertices: Vec2[]) {
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

function onSegment(p: Vec2, q: Vec2, r: Vec2) {
  if (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  )
    return true;

  return false;
}

function doIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2) {
  if (onSegment(a1, b1, a2)) return true;
  if (onSegment(a1, b2, a2)) return true;
  if (onSegment(b1, a1, b2)) return true;
  if (onSegment(b1, a2, b2)) return true;

  return false;
}

export function drawProjectionOnLine(
  ctx: CanvasRenderingContext2D,
  color: string,
  [projectedS1, projectedS2]: [Vec2, Vec2]
) {
  ctx.save();
  ctx.fillStyle = color;
  circle(ctx, projectedS1, 3);
  circle(ctx, projectedS2, 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  line(ctx, projectedS1, projectedS2);
  ctx.restore();
}

export function drawInfiniteLine(
  ctx: CanvasRenderingContext2D,
  p1: Vec2,
  p2: Vec2,
  color?: string
) {
  ctx.save();
  const d = p1.sub(p2);

  const len = Math.max(
    parseFloat(ctx.canvas.style.width),
    parseFloat(ctx.canvas.style.height)
  );
  const l1 = p1.add(d.multScalar(len));
  const l2 = p1.add(d.multScalar(-len));

  ctx.strokeStyle = color || "rgba(100, 100, 100, 0.5)";
  line(ctx, l2, l1);
  ctx.restore();

  return [l1, l2];
}

export function drawProjection(
  ctx: CanvasRenderingContext2D,
  polys: Polygon | [Polygon, Polygon],
  p1: Vec2,
  p2: Vec2
) {
  const origin = new Vec2(
    parseFloat(ctx.canvas.style.width) / 2,
    parseFloat(ctx.canvas.style.height) / 2
  );
  const toOrigin = getTranslationMatrix(origin.x, origin.y);

  const d2 = p2.sub(p1);
  const d1 = p1.sub(p2);

  const len = Math.max(
    parseFloat(ctx.canvas.style.width),
    parseFloat(ctx.canvas.style.height)
  );
  const l1 = d2.unit().multScalar(len).transform(toOrigin);
  const l2 = d2.unit().multScalar(-len).transform(toOrigin);

  ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
  line(ctx, l2, l1);

  const projectionHelper = (poly: Polygon) => {
    const s1 = getSupportPoint(poly.vertices, d1);
    const s2 = getSupportPoint(poly.vertices, d2);

    const projectedS1 = s1.projectOnLine(l1, l2);
    const projectedS2 = s2.projectOnLine(l1, l2);

    ctx.save();
    ctx.setLineDash([5, 15]);
    ctx.strokeStyle = "rgb(150, 150, 150)";
    line(ctx, s1, projectedS1);
    line(ctx, s2, projectedS2);
    ctx.restore();

    return [projectedS1, projectedS2] as [Vec2, Vec2];
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

export const sin = Math.sin;
export const cos = Math.cos;

export function getRotationMatrix(θ: number, { x, y }: Vec2 = new Vec2(0, 0)) {
  return new Matrix([
    [cos(θ), -1 * sin(θ), -x * cos(θ) + y * sin(θ) + x],
    [sin(θ), cos(θ), -x * sin(θ) - y * cos(θ) + y],
    [0, 0, 1],
  ]);
}

export function circle(ctx: CanvasRenderingContext2D, p: Vec2, d: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, d, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();
  ctx.restore();
}

export const niceBlue = "#4763ad";
export const niceGreen = "#63ad47";

function regularPolygonVerts(n: number) {
  const verts = [];
  for (let i = 0; i < n; i++) {
    verts.push([
      Math.cos((2 * Math.PI * i) / n),
      Math.sin((2 * Math.PI * i) / n),
    ] as [number, number]);
  }

  return verts;
}

export function starPoints() {
  const pts: Vec2[] = [];
  const step = Math.PI / 5;

  let n = 0;

  for (let a = -Math.PI / 2; a < (3 * Math.PI) / 2; a += step) {
    let r = n % 2 == 0 ? 2 : 1;
    let x = r * Math.cos(a);
    let y = r * Math.sin(a);
    pts.push(new Vec2(x, y));
    n++;
  }

  return pts;
}

export function initPolygons(
  ctx: CanvasRenderingContext2D,
  providedPoly?: Polygon
) {
  const poly1 = providedPoly || new Polygon(regularPolygonVerts(10), niceGreen);

  const poly2 = new Polygon(
    [
      [-2, 0],
      [-2, 1],
      [-3, 2],
      [-4, 1],
      [-3, 0],
    ],
    niceBlue
  );

  const [w, h] = getWidthAndHeightFromCtx(ctx);
  const origin = new Vec2(w / 2, h / 2);
  const byScalingUp = getScalingMatrix(w * 0.1, w * 0.1);

  poly1.transform(byScalingUp);
  poly1.centerOnPoint(origin.add(new Vec2(w / 4, 0)));
  poly1.rotate(20);

  poly2.transform(byScalingUp);
  poly2.centerOnPoint(origin.add(new Vec2(-w / 4, 0)));
  poly2.rotate(45);

  return [poly1, poly2] as [Polygon, Polygon];
}

export type State = {
  draggedPoly: Polygon | undefined;
  draggedPoint: { poly?: Polygon; point: Vec2 } | undefined;
  rotationChange: number;
  hoveredPoint: Vec2 | undefined;
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
  drawFn: () => void,
  { convexityCheck = true, points = [] as Vec2[] } = {}
) {
  ctx.canvas.style.touchAction = "none";

  const rotationSpeed = 3;
  let state: State = {
    draggedPoly: undefined,
    draggedPoint: undefined,
    rotationChange: 0,
    hoveredPoint: undefined,
  };

  const selectPolygon = (event: { offsetX: number; offsetY: number }) => {
    const mousePos = new Vec2(event.offsetX, event.offsetY);
    if (state.hoveredPoint) {
      state.draggedPoint = { point: state.hoveredPoint };
    }
    for (let poly of polys) {
      if (poly.hoveredVertex) {
        state.draggedPoint = { poly: poly, point: poly.hoveredVertex };
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

  const updateMousePos = (event: PointerEvent) => {
    ctx.canvas.style.touchAction = "none";

    const mousePos = new Vec2(event.offsetX, event.offsetY);

    for (let poly of polys) {
      poly.hoveredVertex = poly.vertices.find((pos) => {
        return (
          mousePos.sub(pos).mag() <= 7 ||
          state?.draggedPoint?.point?.equals(pos)
        );
      });
    }

    for (let point of points) {
      if (mousePos.sub(point).mag() <= 7) {
        state.hoveredPoint = point;
      } else if (state.hoveredPoint?.equals(point)) {
        state.hoveredPoint = undefined;
      }
    }

    if (state.draggedPoly) {
      state.draggedPoly.transform(
        getTranslationMatrix(event.movementX, event.movementY)
      );
      return;
    }

    if (state.draggedPoint) {
      state.draggedPoint.point.transform(
        getTranslationMatrix(event.movementX, event.movementY)
      );
      if (!state.draggedPoint.poly?.isConvex()) {
        if (convexityCheck) {
          state.draggedPoint.point.transform(
            getTranslationMatrix(-event.movementX, -event.movementY)
          );
        } else {
          state.draggedPoint.poly?.triangulate();
        }
      }

      return;
    }

    ctx.canvas.style.touchAction = "pan-y";
  };

  const handleMouseDown = (event: PointerEvent) => {
    selectPolygon(event);
  };

  const handleMouseUp = (event: PointerEvent) => {
    reset();
  };

  const reset = () => {
    state.draggedPoly = undefined;
    if (state.draggedPoint?.poly) {
      state.draggedPoint.poly.hoveredVertex = undefined;
    }

    state.draggedPoint = undefined;
    state.hoveredPoint = undefined;
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
  ctx.canvas.addEventListener("pointermove", updateMousePos);
  ctx.canvas.addEventListener("pointerdown", handleMouseDown);
  ctx.canvas.addEventListener("pointerup", handleMouseUp);

  let frameId = 0;
  const loop = () => {
    frameId = requestAnimationFrame(() => {
      handleRotations(polys, state.rotationChange);
      drawFn();
      if (state.hoveredPoint) {
        ctx.fillStyle = "red";
        circle(ctx, state.hoveredPoint, 5);
      }
      loop();
    });
  };
  loop();

  return {
    cleanup: () => {
      ctx.canvas.removeEventListener("keyup", stopRotation);
      ctx.canvas.removeEventListener("keydown", handleRotation);
      ctx.canvas.removeEventListener("pointermove", updateMousePos);
      ctx.canvas.removeEventListener("pointerdown", handleMouseDown);
      ctx.canvas.removeEventListener("pointerup", handleMouseUp);
      cancelAnimationFrame(frameId);
    },
  };
}

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
  ctx.lineCap = "round";
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

export function getWidthAndHeightFromCtx(ctx: CanvasRenderingContext2D) {
  return [
    parseFloat(ctx.canvas.style.width),
    parseFloat(ctx.canvas.style.height),
  ];
}
export function drawCoordinateSystem(
  ctx: CanvasRenderingContext2D,
  scaleFactor: number
) {
  const [w, h] = getWidthAndHeightFromCtx(ctx);

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
    ctx.strokeStyle = "black";
    drawArrow(
      ctx,
      poly1.centroid(),
      poly1.centroid().add(halfNeg),
      half.mag() / 2
    );
    drawArrow(
      ctx,
      poly2.centroid(),
      poly2.centroid().add(half),
      half.mag() / 2
    );
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
}

export function colorEdge(ctx: CanvasRenderingContext2D, p1: Vec2, p2: Vec2) {
  ctx.save();
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 5;
  line(ctx, p1, p2);
  ctx.restore();
}
