import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";
import { Polygon } from "../lib/math/rect";
import { Vector2 } from "../lib/math/vector";
import {
  drawProjection,
  getScalingMatrix,
  getTranslationMatrix,
  insidePoly,
  line,
  toRadians,
} from "../lib/math/drawHelpers";

const niceBlue = "#4763ad";
const niceGreen = "#63ad47";

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
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let mousePos: Vector2 | undefined = undefined;
    let mouseDown = false;

    const myPoly1 = new Polygon(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      niceGreen
    );

    const myPoly2 = new Polygon(
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
      niceBlue
    );

    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    const toOrigin = getTranslationMatrix(origin.x, origin.y);

    myPoly1.transform(getScalingMatrix(80, 80));
    myPoly1.transform(toOrigin);
    myPoly1.rotate(30);

    myPoly2.transform(getScalingMatrix(80, 80));
    myPoly2.transform(toOrigin);
    myPoly2.rotate(40);

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      ctx.fillStyle = "blue";
      const collision = checkCollision(myPoly1, myPoly2);
      drawAllProjections(cnv, myPoly1, myPoly2);

      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
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

    let draggedPoly: Polygon | null = null;
    let selectedPoly: Polygon | null = null;

    let axis = 1;
    let rotationChange = 0;
    let frameId = 0;

    const myPoly1 = new Polygon(
      [
        [91.3853, 72.056],
        [91.0849, 56.344],
        [61.4993, 61.451],
        [51.9736, 78.969],
        [81.2159, 83.447],
      ],
      niceGreen
    );

    const myPoly2 = new Polygon(
      [
        [-2, 0],
        [-2, 1],
        [-3, 1],
        [-3, 0],
      ],
      niceBlue
    );

    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    const toOrigin = getTranslationMatrix(origin.x, origin.y);

    myPoly1.transform(getScalingMatrix(2, 2));
    myPoly1.transform(toOrigin);
    myPoly1.rotate(20);

    myPoly2.transform(getScalingMatrix(80, 80));
    myPoly2.transform(toOrigin);
    myPoly2.rotate(45);
    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      myPoly1.draw(ctx);
      myPoly2.draw(ctx);

      selectedPoly?.draw(ctx, { selected: true });

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

      selectedPoly?.rotate(rotationChange);
      frameId = requestAnimationFrame(drawFn);
    };

    const updateMousePos = (event: MouseEvent) => {
      if (!draggedPoly) return;
      draggedPoly.transform(
        getTranslationMatrix(event.movementX, event.movementY)
      );
    };

    const handleMouseDown = (event: MouseEvent) => {
      const mousePos = new Vector2(event.offsetX, event.offsetY);

      if (insidePoly(mousePos, myPoly1.vertices)) {
        draggedPoly = myPoly1;
        selectedPoly = myPoly1;
        return;
      }

      if (insidePoly(mousePos, myPoly2.vertices)) {
        draggedPoly = myPoly2;
        selectedPoly = myPoly2;
        return;
      }

      selectedPoly = null;
    };

    const handleMouseUp = () => {
      draggedPoly = null;
    };

    const handleRotation = (event: KeyboardEvent) => {
      if (selectedPoly) {
        switch (event.code) {
          case "KeyA":
            rotationChange = 1;
            break;
          case "KeyD":
            rotationChange = -1;
            break;
        }
      }
    };

    const stopRotation = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyA":
          if (rotationChange === 1) rotationChange = 0;
          break;
        case "KeyD":
          if (rotationChange === -1) rotationChange = 0;
          break;
      }
    };

    cnv.addEventListener("keyup", stopRotation);
    cnv.addEventListener("keydown", handleRotation);
    cnv.addEventListener("mousemove", updateMousePos);
    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("mouseup", handleMouseUp);

    drawFn();

    return () => {
      cnv.removeEventListener("keyup", stopRotation);
      cnv.removeEventListener("keydown", handleRotation);
      cnv.removeEventListener("mousemove", updateMousePos);
      cnv.removeEventListener("mousedown", handleMouseDown);
      cnv.removeEventListener("mouseup", handleMouseUp);
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

    const myPoly = new Polygon(
      [
        [91.3853, 72.056],
        [91.0849, 56.344],
        [61.4993, 61.451],
        [51.9736, 78.969],
        [81.2159, 83.447],
      ],
      niceGreen
    );

    const myPoly2 = new Polygon(
      [
        [-2, 0],
        [-2, 1],
        [-3, 1],
        [-3, 0],
      ],
      niceBlue
    );

    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    const toOrigin = getTranslationMatrix(origin.x, origin.y);

    myPoly.transform(getScalingMatrix(2, 2));
    myPoly.transform(toOrigin);
    myPoly.rotate(10);

    myPoly2.transform(getScalingMatrix(80, 80));
    myPoly2.transform(toOrigin);
    myPoly2.rotate(45);

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";

      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);

      myPoly.draw(ctx);
      myPoly2.draw(ctx);

      const pickVertices = () => {
        const i = axis % myPoly.vertices.length;
        const i2 = (i + 1) % myPoly.vertices.length;
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

    const myRect = new Polygon(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      niceGreen
    );
    const origin = new Vector2(cnv.width / 2, cnv.height / 2);
    myRect.transform(getScalingMatrix(60, 60));
    const toOrigin = getTranslationMatrix(origin.x, origin.y);
    myRect.transform(toOrigin);

    const drawFn = () => {
      ctx.fillStyle = "rgb(240, 240, 240)";
      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);
      myRect.rotate(angleIncrement);
      myRect.draw(ctx);

      const p1 = new Vector2(0, 2);
      const p2 = new Vector2(1, -2);
      drawProjection(cnv, myRect, p1, p2);
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
