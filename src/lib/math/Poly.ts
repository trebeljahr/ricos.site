import { Vector2 } from "./vector";
import { Matrix } from "./matrix";
import {
  circle,
  getRotationMatrix,
  getScalingMatrix,
  getTranslationMatrix,
  toRadians,
} from "./drawHelpers";
import Delaunator from "delaunator";

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

  const rgbs = color
    .match(/(\d{1,})/g)
    ?.map(parseFloat)
    .map((a) => Math.min(255, a + 50));
  if (!rgbs) return color;
  const brighterColor = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`;

  return brighterColor;
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

  centerOnPoint(p: Vector2) {
    const offset = p.sub(this.centroid());
    this.translate(offset);
  }

  triangulate() {
    const p = this.vertices;
    const n = p.length - 1;
    if (n < 3) return [];

    let indexList: number[] = [];
    for (let i = 0; i < this.vertices.length; i++) {
      indexList.push(i);
    }

    let totalTriangleCount = this.vertices.length - 2;
    let totalTriangleIndexCount = totalTriangleCount * 3;

    let triangles = [totalTriangleIndexCount];
    let triangleIndexCount = 0;

    while (indexList.length > 3) {
      for (let i = 0; i < indexList.length; i++) {
        let a = indexList[i];
        let b = getItem(indexList, i - 1);
        let c = getItem(indexList, i + 1);

        let va = this.vertices[a];
        let vb = this.vertices[b];
        let vc = this.vertices[c];

        let va_to_vb = vb.sub(va);
        let va_to_vc = vc.sub(va);

        if (va_to_vb.perpDot(va_to_vc) < 0) {
          continue;
        }

        let isEar = true;

        // Does test ear contain any polygon vertices?
        for (let j = 0; j < this.vertices.length; j++) {
          if (j === a || j === b || j === c) {
            continue;
          }

          let p = this.vertices[j];

          if (isPointInTriangle({ p, triangle: { b: vb, a: va, c: vc } })) {
            isEar = false;
            break;
          }
        }

        if (isEar) {
          triangles[triangleIndexCount++] = b;
          triangles[triangleIndexCount++] = a;
          triangles[triangleIndexCount++] = c;

          indexList.splice(i, 1);
          break;
        }
      }
    }

    triangles[triangleIndexCount++] = indexList[0];
    triangles[triangleIndexCount++] = indexList[1];
    triangles[triangleIndexCount++] = indexList[2];

    const tris = group(triangles, 3).map((tri) => {
      const a = this.vertices[tri[0]];
      const b = this.vertices[tri[1]];
      const c = this.vertices[tri[2]];

      return new Polygon(
        [
          [a.x, a.y],
          [b.x, b.y],
          [c.x, c.y],
        ],
        makeBrighter(this.color)
      );
    });
    return tris;
  }
  triangulateDelaunay() {
    const delaunay = new Delaunator(
      this.vertices.map((v) => [v.x, v.y]).flat()
    );
    return group([...delaunay.triangles], 3).map((tri) => {
      const a = this.vertices[tri[0]];
      const b = this.vertices[tri[1]];
      const c = this.vertices[tri[2]];

      return new Polygon(
        [
          [a.x, a.y],
          [b.x, b.y],
          [c.x, c.y],
        ],
        makeBrighter(this.color)
      );
    });
  }
}

function area(p: Vector2, q: Vector2, r: Vector2) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function filterPoints(vertices: Vector2[]) {
  let end = 0;
  let p = 0;
  let again;
  let i = 100;

  do {
    if (i++ > 100) {
      break;
    }
    again = false;

    const prev = getItem(vertices, p - 1);
    const curr = getItem(vertices, p);
    const next = getItem(vertices, p + 1);

    console.log(prev, curr, next);
    console.log(vertices);
    if (
      vertices[p] === getItem(vertices, p + 1) ||
      area(prev, curr, next) === 0
    ) {
      vertices.splice(p, 1);
      p = p - 1;
      if (vertices[p] === getItem(vertices, p + 1)) break;
      again = true;
    } else {
      p = p + 1;
    }
  } while (again || p !== end);

  return end;
}

function group<T>(array: T[], n: number) {
  return [...Array(Math.ceil(array.length / n))].map((_, i) =>
    array.slice(i * n, (i + 1) * n)
  );
}

function getItem<T>(arr: T[], i: number) {
  if (i >= arr.length) {
    return arr[i % arr.length];
  } else if (i < 0) {
    return arr[(i % arr.length) + arr.length];
  }
  return arr[i];
}

function isPointInTriangle({
  p,
  triangle: { a, b, c },
}: {
  p: Vector2;
  triangle: { a: Vector2; b: Vector2; c: Vector2 };
}) {
  const v0 = c.sub(a);
  const v1 = b.sub(a);
  const v2 = p.sub(a);

  const dot00 = v0.dot(v0);
  const dot01 = v0.dot(v1);
  const dot02 = v0.dot(v2);
  const dot11 = v1.dot(v1);
  const dot12 = v1.dot(v2);

  const denom = dot00 * dot11 - dot01 * dot01;
  const u = (dot11 * dot02 - dot01 * dot12) / denom;
  const v = (dot00 * dot12 - dot01 * dot02) / denom;

  return u >= 0 && v >= 0 && u + v < 1;
}
