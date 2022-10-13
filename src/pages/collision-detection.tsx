import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  drawProjection,
  initPolygons,
  instrument,
  line,
  State,
} from "../lib/math/drawHelpers";

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

function drawAllProjections(
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

function checkCollision(poly1: Polygon, poly2: Polygon) {
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

function drawBackground(ctx: CanvasRenderingContext2D) {
  const [w, h] = [ctx.canvas.width, ctx.canvas.height];

  ctx.fillStyle = "rgb(240, 240, 240)";
  ctx.fillRect(0, 0, w, h);

  // ctx.strokeStyle = "red";
  // line(ctx, 0, h / 2, w, h / 2);
  // line(ctx, w / 2, 0, w / 2, h);
}

const SAT = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [myPoly1, myPoly2] = initPolygons(cnv);
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(myPoly1, myPoly2);
      drawAllProjections(cnv, myPoly1, myPoly2);
      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
    };

    const { cleanup } = instrument(cnv, [myPoly1, myPoly2], drawFn);
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

function colorEdge(ctx: CanvasRenderingContext2D, p1: Vector2, p2: Vector2) {
  ctx.save();
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 5;
  line(ctx, p1.x, p1.y, p2.x, p2.y);
  ctx.restore();
}

const ExampleWith2 = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [myPoly1, myPoly2] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      myPoly1.draw(ctx);
      myPoly2.draw(ctx);
      const [p1, p2] = [myPoly1.vertices[0], myPoly1.vertices[1]];
      colorEdge(ctx, p1, p2);
      drawProjection(
        cnv,
        [myPoly1, myPoly2],
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
    };

    const { cleanup } = instrument(cnv, [myPoly1, myPoly2], drawFn);

    drawFn();

    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

const AxisByAxis = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let axis = 0;
    let current = 0;

    const polys = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      polys.forEach((poly) => poly.draw(ctx));

      const pickEdge = (poly: Polygon) => {
        const i = axis;
        const i2 = (i + 1) % poly.vertices.length;
        return [poly.vertices[i], poly.vertices[i2]];
      };

      const [p1, p2] = pickEdge(polys[current]);

      drawProjection(
        cnv,
        polys,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
      colorEdge(ctx, p1, p2);
    };

    const { cleanup } = instrument(cnv, polys, drawFn);
    const intervalId = setInterval(() => {
      axis++;
      if (axis >= polys[current].vertices.length) {
        current++;
        current = current >= polys.length ? 0 : current;
        axis = 0;
      }
    }, 1000);
    return () => {
      clearInterval(intervalId);
      cleanup;
    };
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

const ProjectionDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    const [poly1] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);
      poly1.draw(ctx);
      const p1 = new Vector2(0, 2);
      const p2 = new Vector2(1, -2);
      drawProjection(cnv, poly1, p1, p2);
    };

    const { cleanup } = instrument(cnv, [poly1], drawFn);
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

const CollisionDetectionDemo = () => {
  return (
    <Layout
      title="Collision Detection – A collision detection demo"
      description="An interactive demo of different collision detection algorithms"
    >
      <article>
        <section className="main-section">
          <h1>Collision Detection Demo!</h1>
          <ProjectionDemo />
          <ExampleWith2 />
          <AxisByAxis />
          <SAT />
        </section>
      </article>
    </Layout>
  );
};

export default CollisionDetectionDemo;
