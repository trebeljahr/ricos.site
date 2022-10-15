import { Vector2 } from "./vector";
import { Matrix } from "./matrix";
import { circle, getRotationMatrix, toRadians } from "./drawHelpers";

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

const niceRed = "#dd292c";

function isHex(hex: string) {
  return hex.match(/#[a-fA-F0-9]{6}$/);
}

function convertHexToRgb(hex: string) {
  if (!isHex) throw Error("Not a Hex Color!");
  return `rgb(
    ${parseInt(hex.substring(1, 3), 16)},
    ${parseInt(hex.substring(3, 5), 16)},
    ${parseInt(hex.substring(5, 7), 16)})`;
}
function makeBrighter(color: string) {
  if (isHex(color)) color = convertHexToRgb(color);

  color = color.replace("rgb(", "rgba(");
  color = color.substring(0, color.length - 2) + ", 0.5)";
  return color;
}

export class Polygon {
  public vertices: Vector2[];
  public color: string;
  public selected: boolean;
  public hover: boolean;
  public hoveredVertex: Vector2 | undefined;

  constructor(points: [number, number][], color?: string) {
    this.vertices = points.map(([x, y]) => new Vector2(x, y));
    this.color = color || randomColor();
    this.selected = false;
    this.hover = false;
  }

  get hoverColor() {
    return makeBrighter(this.color);
  }

  centroid() {
    return this.vertices
      .reduce((agg, val) => {
        return agg.add(val);
      }, new Vector2(0, 0))
      .divScalar(this.vertices.length);
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

  rotate(angle: number) {
    this.transform(getRotationMatrix(toRadians(angle), this.centroid()));
  }

  draw(
    ctx: CanvasRenderingContext2D,
    { collision }: { collision?: boolean } = {}
  ) {
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const [first, ...rest] = this.vertices;
    ctx.moveTo(first.x, first.y);
    for (let vertex of rest) {
      ctx.fillStyle = "blue";
      ctx.lineTo(vertex.x, vertex.y);
    }
    ctx.lineTo(first.x, first.y);
    ctx.fillStyle = collision ? niceRed : this.color;
    ctx.fill();
    ctx.lineWidth = this.selected ? 3 : this.hover ? 2 : 1;
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = "black";
    const centroid = this.centroid();
    circle(ctx, centroid, 1);

    for (let vertex of this.vertices) {
      ctx.fillStyle = "blue";

      circle(ctx, vertex, 7);
    }
    ctx.fillStyle = "red";
    this.hoveredVertex && circle(ctx, this.hoveredVertex, 7);

    ctx.restore();
  }
}
