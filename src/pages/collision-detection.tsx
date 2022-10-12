import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon, Rect } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  circle,
  drawProjection,
  getRotationMatrix,
  getScalingMatrix,
  getSupportPoint,
  getTranslationMatrix,
  insidePoly,
  line,
  toRadians,
} from "../lib/math/drawHelpers";
import { Matrix } from "../lib/math/matrix";

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

function getDistance(projection1: Projection, projection2: Projection) {
  if (projection1.max < projection2.min)
    return projection2.min - projection1.max;
  else return projection1.min - projection2.max;
}

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
    let p1 = new Vector2(cnv.width / 2 + e.x * 1e4, cnv.height / 2 + e.y * 1e4);
    let p2 = new Vector2(
      cnv.width / 2 - e.x * 1e4,
      cnv.height / 2 + -e.y * 1e4
    );

    drawProjection(cnv, poly1, p1, p2);
    drawProjection(cnv, poly2, p1, p2);
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

const SAT = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let mousePos: Vector2 | undefined = undefined;
    let mouseDown = false;
    let axis = 1;

    const myPoly1 = new Polygon([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);

    const myPoly2 = new Polygon([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);

    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    const toOrigin = getTranslationMatrix(origin.x, origin.y);

    myPoly1.transform(getScalingMatrix(80, 80));
    myPoly1.transform(toOrigin);
    myPoly1.transform(getRotationMatrix(toRadians(30)));

    myPoly2.transform(getScalingMatrix(80, 80));
    myPoly2.transform(toOrigin);
    myPoly2.transform(getRotationMatrix(toRadians(40)));

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      ctx.fillStyle = "blue";
      const isColliding = checkCollision(myPoly1, myPoly2);
      console.log(isColliding);
      myPoly1.draw(ctx, isColliding);
      myPoly2.draw(ctx, isColliding);
      drawAllProjections(cnv, myPoly1, myPoly2);
    };

    const updateMousePos = (event: MouseEvent) => {
      mousePos = new Vector2(event.offsetX, event.offsetY);
      if (mouseDown && insidePoly(mousePos, myPoly1.vertices)) {
        myPoly1.transform(
          getTranslationMatrix(event.movementX, event.movementY)
        );
        drawFn();
      } else if (mouseDown && insidePoly(mousePos, myPoly2.vertices)) {
        myPoly2.transform(
          getTranslationMatrix(event.movementX, event.movementY)
        );
        drawFn();
      }
      // console.log(mousePos.x, mousePos.y);
    };

    const handleMouseDown = () => {
      mouseDown = true;
    };

    const handleMouseUp = () => {
      mouseDown = false;
    };

    cnv.addEventListener("mousemove", updateMousePos);
    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("mouseup", handleMouseUp);

    drawFn();

    return () => {
      cnv.removeEventListener("mousemove", updateMousePos);
      cnv.removeEventListener("mousedown", handleMouseDown);
      cnv.removeEventListener("mouseup", handleMouseUp);

      cancelAnimationFrame(animationFrameId);
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

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let mousePos: Vector2 | undefined = undefined;
    let mouseDown = false;
    let axis = 1;

    const myPoly1 = new Polygon([
      [91.3853, 72.056],
      [91.0849, 56.344],
      [61.4993, 61.451],
      [51.9736, 78.969],
      [81.2159, 83.447],
    ]);

    const myPoly2 = new Polygon([
      [-2, 0],
      [-2, 1],
      [-3, 1],
      [-3, 0],
    ]);

    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    const toOrigin = getTranslationMatrix(origin.x, origin.y);
    const rotateAroundOrigin = getRotationMatrix(Math.PI / 3, origin);

    myPoly1.transform(getScalingMatrix(2, 2));
    myPoly1.transform(toOrigin);
    myPoly1.transform(rotateAroundOrigin);

    myPoly2.transform(getScalingMatrix(80, 80));
    myPoly2.transform(toOrigin);
    myPoly2.transform(rotateAroundOrigin);

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      ctx.fillStyle = "blue";
      myPoly1.draw(ctx, mousePos && insidePoly(mousePos, myPoly1.vertices));
      myPoly2.draw(ctx, mousePos && insidePoly(mousePos, myPoly2.vertices));

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

    const updateMousePos = (event: MouseEvent) => {
      mousePos = new Vector2(event.offsetX, event.offsetY);
      if (mouseDown && insidePoly(mousePos, myPoly1.vertices)) {
        myPoly1.transform(
          getTranslationMatrix(event.movementX, event.movementY)
        );
      } else if (mouseDown && insidePoly(mousePos, myPoly2.vertices)) {
        myPoly2.transform(
          getTranslationMatrix(event.movementX, event.movementY)
        );
      }
      drawFn();
      // console.log(mousePos.x, mousePos.y);
    };

    const handleMouseDown = () => {
      mouseDown = true;
    };

    const handleMouseUp = () => {
      mouseDown = false;
    };

    cnv.addEventListener("mousemove", updateMousePos);
    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("mouseup", handleMouseUp);

    drawFn();

    return () => {
      cnv.removeEventListener("mousemove", updateMousePos);
      cnv.removeEventListener("mousedown", handleMouseDown);
      cnv.removeEventListener("mouseup", handleMouseUp);

      cancelAnimationFrame(animationFrameId);
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

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;

    let axis = 0;

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      const myPoly = new Polygon([
        [91.3853, 72.056],
        [91.0849, 56.344],
        [61.4993, 61.451],
        [51.9736, 78.969],
        [81.2159, 83.447],
      ]);

      const myPoly2 = new Polygon([
        [-2, 0],
        [-2, 1],
        [-3, 1],
        [-3, 0],
      ]);

      const origin = new Vector2(cnv.width / 2, cnv.height / 2);
      const toOrigin = getTranslationMatrix(origin.x, origin.y);
      const rotateAroundOrigin = getRotationMatrix(Math.PI / 3, origin);

      myPoly.transform(getScalingMatrix(2, 2));
      myPoly.transform(toOrigin);
      myPoly.transform(rotateAroundOrigin);

      myPoly2.transform(getScalingMatrix(80, 80));
      myPoly2.transform(toOrigin);
      myPoly2.transform(rotateAroundOrigin);

      myPoly.draw(ctx);
      myPoly2.draw(ctx);

      const pickVertices = () => {
        const i = axis % myPoly.vertices.length;
        const i2 = (i + 1) % myPoly.vertices.length;
        console.log(i, i2);
        return [myPoly.vertices[i], myPoly.vertices[i2]];
      };

      const [p1, p2] = pickVertices();
      ctx.save();
      ctx.strokeStyle = "green";
      ctx.lineWidth = 5;
      line(ctx, p1.x, p1.y, p2.x, p2.y);
      ctx.restore();

      drawProjection(
        cnv,
        myPoly,
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

      cancelAnimationFrame(animationFrameId);
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

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    let angle = 0.1;
    let angleIncrement = 0;
    let animationFrameId = 0;

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";
      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      angle += angleIncrement;

      const myRect = new Rect(50, 50, 100, 100);
      const origin = new Vector2(cnv.width / 2, cnv.height / 2);
      const toOrigin = getTranslationMatrix(origin.x, origin.y);
      myRect.transform(toOrigin);
      const rotateAroundOrigin = getRotationMatrix(angle, origin);
      myRect.transform(rotateAroundOrigin);

      myRect.draw(ctx);

      const p1 = new Vector2(0, 2);
      const p2 = new Vector2(1, -2);
      drawProjection(cnv, myRect, p1, p2);
      if (angleIncrement !== 0) requestAnimationFrame(drawFn);
    };

    drawFn();

    const handleMouseDown = (event: MouseEvent) => {
      angleIncrement = event.ctrlKey ? -0.03 : 0.03;
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
