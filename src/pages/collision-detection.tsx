import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Rect } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  circle,
  getProjectionMatrix,
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

    const drawFn = () => {
      ctx.fillStyle = "rgb(210, 210, 210)";
      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.save();
      angle += 0.01;

      const myRect = new Rect(0, 0, 100, 100);
      const origin = new Vector2(cnv.width / 2, cnv.height / 2);
      myRect.transform(getTranslationMatrix(origin.x, origin.y));
      const rotateAroundOrigin = getRotationMatrix(angle, origin);
      myRect.transform(rotateAroundOrigin);

      myRect.draw(ctx);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      ctx.strokeStyle = "blue";
      const p1 = new Vector2(-100, cnv.height);
      const p2 = new Vector2(200, 0);

      const d1 = p1.sub(p2);
      const d2 = p2.sub(p1);

      const s1 = getSupportPoint(myRect.vertices, d1);

      const projection = getProjectionMatrix(d1);
      const projectedS1 = new Vector2(s1.x, s1.y).transform(projection);
      console.log(projectedS1);
      const s2 = getSupportPoint(myRect.vertices, d2);

      ctx.fillStyle = "blue";
      circle(ctx, s1, 5);
      circle(ctx, s2, 5);
      ctx.fillStyle = "red";
      circle(ctx, projectedS1, 5);

      line(ctx, p1.x, p1.y, p2.x, p2.y);

      const unitV = d2
        .unit()
        .multScalar(100)
        .transform(getTranslationMatrix(origin.x, origin.y));

      line(ctx, origin.x, origin.y, unitV.x, unitV.y);
      // requestAnimationFrame(drawFn);
    };

    drawFn();
    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      mouseX = event.offsetX;
      mouseY = event.offsetY;

      return false;
    };

    cnv.addEventListener("click", handleMouseMove);

    return () => {
      cnv.removeEventListener("click", handleMouseMove);
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
