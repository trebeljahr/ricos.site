import { Vector2 } from "./vector";
import { Matrix } from "./matrix";

export class Rect {
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
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(this.topLeft.x, this.topLeft.y);
    ctx.lineTo(this.topRight.x, this.topRight.y);
    ctx.lineTo(this.bottomRight.x, this.bottomRight.y);
    ctx.lineTo(this.bottomLeft.x, this.bottomLeft.y);
    ctx.lineTo(this.topLeft.x, this.topLeft.y);

    ctx.stroke();
    ctx.closePath();
  }
}

const randomBetween = (min: number, max: number) => {
  return min + Math.floor(Math.random() * (max - min + 1));
};

function randomColor() {
  const r = randomBetween(0, 255);
  const g = randomBetween(0, 255);
  const b = randomBetween(0, 255);
  const rgb = `rgb(${r},${g},${b})`;
  return rgb;
}
export class Polygon {
  public vertices: Vector2[];
  public color: string;

  constructor(points: [number, number][], color?: string) {
    this.vertices = points.map(([x, y]) => new Vector2(x, y));
    this.color = color || randomColor();
  }

  edgeNormals() {
    return this.vertices.map((_, i) => {
      let p1 = this.vertices[i];
      let p2 = this.vertices[i + 1] || this.vertices[0];

      let edge = new Vector2(p2.x - p1.x, p2.y - p1.y);
      let normal = edge.getNormal();
      return normal;
    });
  }

  transform(matrix: Matrix) {
    this.vertices = this.vertices.map((vertex) => vertex.transform(matrix));
  }

  draw(ctx: CanvasRenderingContext2D, fill?: boolean) {
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const [first, ...rest] = this.vertices;
    ctx.moveTo(first.x, first.y);
    for (let vertex of rest) {
      ctx.lineTo(vertex.x, vertex.y);
    }
    ctx.lineTo(first.x, first.y);
    ctx.fillStyle = fill ? "red" : this.color;
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
}
