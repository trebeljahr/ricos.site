import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  drawProjection,
  getScalingMatrix,
  getTranslationMatrix,
  initPolygons,
  insidePoly,
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

  ctx.strokeStyle = "red";
  line(ctx, 0, h / 2, w, h / 2);
  line(ctx, w / 2, 0, w / 2, h);
}

const SAT = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let state: State = {
      draggedPoly: null,
      selectedPoly: null,
      rotationChange: 0,
    };
    let frameId = 0;
    const [myPoly1, myPoly2] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      ctx.fillStyle = "blue";
      const collision = checkCollision(myPoly1, myPoly2);
      drawAllProjections(cnv, myPoly1, myPoly2);

      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
      state.selectedPoly?.rotate(state.rotationChange);
      state.selectedPoly?.draw(ctx, { selected: true, collision });
      frameId = requestAnimationFrame(drawFn);
    };

    drawFn();

    const cleanup = instrument(cnv, [myPoly1, myPoly2], state);
    return () => {
      cleanup();
      cancelAnimationFrame(frameId);
    };
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

const MoveByMouse = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let state: State = {
      draggedPoly: null,
      selectedPoly: null,
      rotationChange: 0,
    };

    let axis = 1;

    let frameId = 0;

    const [myPoly1, myPoly2] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      myPoly1.draw(ctx);
      myPoly2.draw(ctx);

      state.selectedPoly?.draw(ctx, { selected: true });

      const pickVertices = () => {
        const i = axis % myPoly1.vertices.length;
        const i2 = (i + 1) % myPoly1.vertices.length;
        return [myPoly1.vertices[i], myPoly1.vertices[i2]];
      };

      const [p1, p2] = pickVertices();
      ctx.save();
      ctx.strokeStyle = "green";
      ctx.lineWidth = 5;
      line(ctx, p1.x, p1.y, p2.x, p2.y);
      ctx.restore();

      drawProjection(
        cnv,
        myPoly1,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
      drawProjection(
        cnv,
        myPoly2,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );

      state.selectedPoly?.rotate(state.rotationChange);
      frameId = requestAnimationFrame(drawFn);
    };

    const cleanup = instrument(cnv, [myPoly1, myPoly2], state);
    drawFn();

    return () => {
      cleanup();
      cancelAnimationFrame(frameId);
    };
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};

const ProjectionAxisByAxis = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let axis = 0;

    const [myPoly1, myPoly2] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      myPoly1.draw(ctx);
      myPoly2.draw(ctx);

      const pickVertices = () => {
        const i = axis % myPoly1.vertices.length;
        const i2 = (i + 1) % myPoly1.vertices.length;
        return [myPoly1.vertices[i], myPoly1.vertices[i2]];
      };

      const [p1, p2] = pickVertices();
      ctx.save();
      ctx.strokeStyle = "green";
      ctx.lineWidth = 5;
      line(ctx, p1.x, p1.y, p2.x, p2.y);
      ctx.restore();

      drawProjection(
        cnv,
        myPoly1,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
      drawProjection(
        cnv,
        myPoly2,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
    };

    function selectNextAxis() {
      axis = axis + 1;
      drawFn();
    }

    cnv.addEventListener("click", selectNextAxis);
    drawFn();

    return () => {
      cnv.removeEventListener("click", selectNextAxis);
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
    let angleIncrement = 0;
    let animationFrameId = 0;

    const [poly1] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      poly1.rotate(angleIncrement);
      poly1.draw(ctx);

      const p1 = new Vector2(0, 2);
      const p2 = new Vector2(1, -2);
      drawProjection(cnv, poly1, p1, p2);
      if (angleIncrement !== 0) requestAnimationFrame(drawFn);
    };

    drawFn();

    const handleMouseDown = (event: MouseEvent) => {
      angleIncrement = event.ctrlKey ? -3 : 3;
      drawFn();
    };

    const handleMouseUp = () => {
      angleIncrement = 0;
    };

    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("mouseup", handleMouseUp);

    return () => {
      cnv.removeEventListener("mousedown", handleMouseDown);
      cnv.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
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
          <ProjectionAxisByAxis />
          <MoveByMouse />
          <SAT />
          {/* <Canvas
            drawFn={(ctx, width, height) => {
              ctx.fillStyle = "blue";
              ctx.fillRect(0, 0, width, height);
            }}
          />
          <Canvas
            drawFn={(ctx, width, height) => {
              ctx.fillStyle = "red";
              ctx.fillRect(0, 0, width, height);
            }}
          /> */}
        </section>
      </article>
    </Layout>
  );
};

export default CollisionDetectionDemo;
