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
