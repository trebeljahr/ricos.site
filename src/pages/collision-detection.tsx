import Layout from "../components/layout";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useEffect, useState } from "react";

// const toDegrees = (radians: number) => (radians * 180) / Math.PI;
// const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const sum = (arr: number[]) => arr.reduce((acc, value) => acc + value, 0);

class Matrix {
  public rows: [number, number, number][];
  constructor(rows: [number, number, number][]) {
    this.rows = rows;
  }
  get a() {
    return this.rows[0][0];
  }
  get b() {
    return this.rows[0][1];
  }
  get c() {
    return this.rows[0][2];
  }

  get d() {
    return this.rows[1][0];
  }
  get e() {
    return this.rows[1][1];
  }
  get f() {
    return this.rows[1][2];
  }
  columns() {
    return this.rows[0].map((_, i) => this.rows.map((r) => r[i]));
  }
}

class Vector2 {
  public x: number;
  public y: number;
  public z: number;
  public components: [number, number, number];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.z = 1;
    this.components = [x, y, this.z];
  }

  dot(other: Vector2) {
    return this.x * other.x + this.y + other.y;
  }

  transform(matrix: Matrix) {
    const columns = matrix.columns();
    if (columns.length !== this.components.length) {
      throw new Error(
        "Matrix columns length should be equal to vector components length."
      );
    }

    const newX = matrix.a * this.x + matrix.b * this.y + matrix.c;
    const newY = matrix.d * this.x + matrix.e * this.y + matrix.f;
    this.x = newX;
    this.y = newY;
    return this;
  }

  *[Symbol.iterator](): IterableIterator<number> {
    yield this.x;
    yield this.y;
  }
}

class Rect {
  public vertices: Vector2[];
  public topLeft: Vector2;
  public topRight: Vector2;
  public bottomRight: Vector2;
  public bottomLeft: Vector2;

  constructor(x: number, y: number, width: number, height: number) {
    this.topLeft = new Vector2(x, y);
    this.topRight = new Vector2(x + width, y);
    this.bottomRight = new Vector2(x + width, y + height);
    this.bottomLeft = new Vector2(x, y + height);
    this.vertices = [
      this.topLeft,
      this.topRight,
      this.bottomRight,
      this.bottomLeft,
    ];
  }

  transform(matrix: Matrix) {
    this.vertices = this.vertices.map((vertex) => vertex.transform(matrix));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.moveTo(this.topLeft.x, this.topLeft.y);
    ctx.lineTo(this.topRight.x, this.topRight.y);
    ctx.lineTo(this.bottomRight.x, this.bottomRight.y);
    ctx.lineTo(this.bottomLeft.x, this.bottomLeft.y);
    ctx.lineTo(this.topLeft.x, this.topLeft.y);

    ctx.fill();
    ctx.closePath();
  }
}

function getSupportPoint(vertices: Vector2[], d: Vector2) {
  let highest = -Infinity;
  let support = new Vector2(0, 0);

  for (let vertex of vertices) {
    const dot = vertex.dot(d);

    if (dot > highest) {
      highest = dot;
      support = vertex;
    }
  }

  return support;
}

function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

const ProjectionDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    let mouseX = 0;
    let mouseY = 0;
    let angle = 0.1;

    const translationMatrix = new Matrix([
      [1, 0, cnv.width / 2 - 10],
      [0, 1, cnv.height / 2 - 10],
      [0, 0, 1],
    ]);
    const rotationMatrix = new Matrix([
      [Math.cos(angle), -1 * Math.sin(angle), 0],
      [Math.sin(angle), Math.cos(angle), 0],
      [0, 0, 1],
    ]);

    const drawFn = () => {
      ctx.fillStyle = "rgb(210, 210, 210)";
      ctx.fillRect(0, 0, cnv.width, cnv.height);

      ctx.save();
      // angle += 0.1;

      // const translateToMouse = new Matrix([
      //   [1, 0, mouseX],
      //   [0, 1, mouseY],
      //   [0, 0, 1],
      // ]);

      // const origin = new Vector2(0, 0);
      // origin.transform(translationMatrix);
      // origin.transform(rotationMatrix);
      // ctx.fillStyle = "blue";
      // ctx.arc(origin.x, origin.y, 10, 0, 2 * Math.PI);
      // ctx.fill();

      const myRect = new Rect(0, 0, 100, 100);
      myRect.transform(translationMatrix);
      myRect.transform(rotationMatrix);
      myRect.draw(ctx);

      ctx.strokeStyle = "red";
      line(ctx, 0, cnv.height / 2, cnv.width, cnv.height / 2);
      line(ctx, cnv.width / 2, 0, cnv.width / 2, cnv.height);
    };

    drawFn();
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.offsetX;
      mouseY = event.offsetY;
      drawFn();
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
