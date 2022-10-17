import { Vector2 } from "./vector";
import { Matrix } from "./matrix";
import {
  circle,
  getRotationMatrix,
  getScalingMatrix,
  getTranslationMatrix,
  toRadians,
} from "./drawHelpers";

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

const TWO_PI = 2 * Math.PI;

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

  scale(x: number, y: number) {
    this.transform(getScalingMatrix(x, y));
  }

  translate(displacement: Vector2) {
    this.transform(getTranslationMatrix(displacement.x, displacement.y));
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
      ctx.fillStyle = this.hoveredVertex?.equals(vertex) ? "red" : "black";
      circle(ctx, vertex, this.hoveredVertex?.equals(vertex) ? 8 : 2);
    }

    ctx.restore();
  }

  isConvex() {
    try {
      const polygon = this.vertices;
      if (polygon.length < 3) {
        return false;
      }
      let { x: old_x, y: old_y } = polygon[polygon.length - 2];
      let { x: new_x, y: new_y } = polygon[polygon.length - 1];
      let new_direction = Math.atan2(new_y - old_y, new_x - old_x);
      let angle_sum = 0.0;
      let orientation = 0;
      for (let i = 0; i < polygon.length; i++) {
        const newpoint = polygon[i];
        let old_x = new_x;
        let old_y = new_y;
        let old_direction = new_direction;
        new_x = newpoint.x;
        new_y = newpoint.y;
        new_direction = Math.atan2(new_y - old_y, new_x - old_x);

        if (old_x == new_x && old_y == new_y) {
          return false;
        }

        let angle = new_direction - old_direction;
        if (angle <= -Math.PI) {
          angle += TWO_PI; // make it in half-open interval (-Pi, Pi]
        } else if (angle > Math.PI) {
          angle -= TWO_PI;
        }
        if (i === 0) {
          if (angle === 0.0) {
            return false;
          }
          orientation = angle > 0 ? 1 : -1.0;
        } else {
          if (orientation * angle <= 0.0) {
            return false;
          }
        }
        angle_sum += angle;
      }

      return Math.abs(Math.round(angle_sum / TWO_PI)) == 1;
    } catch (error) {
      return false;
    }
  }
}
