import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Rect } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  circle,
  getRotationMatrix,
  getSupportPoint,
  getTranslationMatrix,
  line,
} from "../lib/math/drawHelpers";

const ProjectionDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    let mouseX = 0;
    let mouseY = 0;
    let angle = 0.1;
    let angleIncrement = 0;
    let animationFrameId = 0;

    const drawFn = () => {
      ctx.fillStyle = "rgb(210, 210, 210)";
      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      ctx.save();
      angle += angleIncrement;

      const myRect = new Rect(50, 50, 100, 100);
      const origin = new Vector2(cnv.width / 2, cnv.height / 2);
      const toOrigin = getTranslationMatrix(origin.x, origin.y);
      myRect.transform(toOrigin);
      const rotateAroundOrigin = getRotationMatrix(angle, origin);
      myRect.transform(rotateAroundOrigin);

      myRect.draw(ctx);

      ctx.strokeStyle = "blue";

      const p1 = new Vector2(0, 0);
      const p2 = new Vector2(1, -1);

      const d1 = p1.sub(p2);
      const d2 = p2.sub(p1);

      const s1 = getSupportPoint(myRect.vertices, d1);
      const s2 = getSupportPoint(myRect.vertices, d2);

      ctx.fillStyle = "blue";
      circle(ctx, s1, 2);
      circle(ctx, s2, 2);

      const unitV = d2.unit().multScalar(cnv.width).transform(toOrigin);
      const unitV2 = d2.unit().multScalar(-cnv.width).transform(toOrigin);

      line(ctx, unitV2.x, unitV2.y, unitV.x, unitV.y);

      const projectedS1 = s1.project(d2);
      const projectedS2 = s2.project(d2);

      console.log(projectedS1);
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";
      circle(ctx, projectedS1.transform(toOrigin), 5);
      circle(ctx, projectedS2.transform(toOrigin), 5);
      animationFrameId = requestAnimationFrame(drawFn);
    };

    drawFn();
    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      mouseX = event.offsetX;
      mouseY = event.offsetY;

      return false;
    };

    const handleMouseDown = (event: MouseEvent) => {
      angleIncrement = event.ctrlKey ? -0.01 : 0.01;
    };

    const handleMouseUp = () => {
      angleIncrement = 0;
    };

    cnv.addEventListener("click", handleMouseMove);
    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("mouseup", handleMouseUp);

    return () => {
      cnv.removeEventListener("click", handleMouseMove);
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
