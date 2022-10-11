import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon, Rect } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  circle,
  getRotationMatrix,
  getScalingMatrix,
  getSupportPoint,
  getTranslationMatrix,
  insidePoly,
  line,
} from "../lib/math/drawHelpers";

function drawProjection(
  cnv: HTMLCanvasElement,
  rect: Rect | Polygon,
  p1: Vector2,
  p2: Vector2
) {
  const ctx = cnv.getContext("2d");
  if (!ctx) return;

  const origin = new Vector2(cnv.width / 2, cnv.height / 2);
  const toOrigin = getTranslationMatrix(origin.x, origin.y);

  const d1 = p1.sub(p2);
  const d2 = p2.sub(p1);

  const s1 = getSupportPoint(rect.vertices, d1);
  const s2 = getSupportPoint(rect.vertices, d2);

  ctx.fillStyle = "blue";
  circle(ctx, s1, 2);
  circle(ctx, s2, 2);

  const unitV = d2.unit().multScalar(cnv.width).transform(toOrigin);
  const unitV2 = d2.unit().multScalar(-cnv.width).transform(toOrigin);

  line(ctx, unitV2.x, unitV2.y, unitV.x, unitV.y);

  const projectedS1 = s1.project(unitV, unitV2);
  const projectedS2 = s2.project(unitV, unitV2);

  ctx.fillStyle = "red";
  circle(ctx, projectedS1, 5);
  circle(ctx, projectedS2, 5);

  line(ctx, s1.x, s1.y, projectedS1.x, projectedS1.y);
  line(ctx, s2.x, s2.y, projectedS2.x, projectedS2.y);
}

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
