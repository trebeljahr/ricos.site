import { Vec2 } from "./vector";
import { Matrix } from "./matrix";
import {
  circle,
  getRotationMatrix,
  getScalingMatrix,
  getTranslationMatrix,
  toRadians,
} from "./drawHelpers";
import {
  drawBackground,
  visualizeCollision,
} from "../../components/collision-detection/helpers";

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
  public vertices: Vec2[];
  public color: string;
  public selected: boolean;
  public hover: boolean;
  public hoveredVertex: Vec2 | undefined;
  public triangles: Polygon[];

  constructor(points: Vec2[], color?: string);
  constructor(points: [number, number][], color?: string);

  constructor(points: [number, number][] | Vec2[], color?: string) {
    this.vertices =
      points[0] instanceof Vec2
        ? (points as Vec2[])
        : points.map(([x, y]) => new Vec2(x, y));
    this.color = color || randomColor();
    this.selected = false;
    this.hover = false;
    this.triangles = [] as Polygon[];
    if (!this.isConvex()) {
      this.triangulate();
    }
  }

  get hoverColor() {
    return makeBrighter(this.color);
  }

  centroid() {
    return this.vertices
      .reduce((agg, val) => {
        return agg.add(val);
      }, new Vec2(0, 0))
      .divScalar(this.vertices.length);
  }

  edgeNormals() {
    return this.vertices.map((_, i) => {
      let p1 = this.vertices[i];
      let p2 = this.vertices[i + 1] || this.vertices[0];

      let edge = new Vec2(p2.x - p1.x, p2.y - p1.y);
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

  translate(displacement: Vec2) {
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

  centerOnPoint(p: Vec2) {
    const offset = p.sub(this.centroid());
    this.translate(offset);
  }

  triangulate() {
    const n = this.vertices.length - 1;
    if (n < 3) return [];

    let indexList: number[] = [];
    for (let i = 0; i < this.vertices.length; i++) {
      indexList.push(i);
    }

    let triangleIndexCount = 0;

    let i = 0;
    while (indexList.length > 3) {
      if (i++ > 1000) {
        break;
      }
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

          if (
            isPointInTriangle({
              p: this.vertices[j],
              triangle: { b: vb, a: va, c: vc },
            })
          ) {
            isEar = false;
            break;
          }
        }

        if (isEar) {
          this.triangles[triangleIndexCount++] = new Polygon(
            [va, vb, vc],
            makeBrighter(this.color)
          );
          indexList.splice(i, 1);
          break;
        }
      }
    }

    this.triangles[triangleIndexCount++] = new Polygon(
      [
        this.vertices[indexList[0]],
        this.vertices[indexList[1]],
        this.vertices[indexList[2]],
      ],
      makeBrighter(this.color)
    );
  }
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
  p: Vec2;
  triangle: { a: Vec2; b: Vec2; c: Vec2 };
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

function sleep(amount: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, amount);
  });
}

function getPolyFromIndexList(poly: Polygon, indexList: number[]) {
  const verts = indexList.reduce((agg, i) => {
    return [...agg, poly.vertices[i]];
  }, [] as Vec2[]);
  return new Polygon(verts, poly.color);
}

export async function triangulateVisualization(
  ctx: CanvasRenderingContext2D,
  poly: Polygon,
  indexList: number[]
) {
  const vertices = poly.vertices;
  let j = 0;
  const foundTriangles: Polygon[] = [];

  while (indexList.length > 3) {
    if (j++ > 1000) {
      break;
    }

    for (let i = 0; i < indexList.length; i++) {
      drawBackground(ctx);
      foundTriangles.forEach((tri) => tri.draw(ctx));
      getPolyFromIndexList(poly, indexList).draw(ctx);

      const a = indexList[i];
      const b = getItem(indexList, i - 1);
      const c = getItem(indexList, i + 1);

      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];

      const va_to_vb = vb.sub(va);
      const va_to_vc = vc.sub(va);

      const checkingTri = new Polygon([va, vb, vc], "rgba(50, 50, 250, 0.5)");
      checkingTri.draw(ctx);

      await sleep(1000);

      if (va_to_vb.perpDot(va_to_vc) < 0) {
        checkingTri.color = "red";
        checkingTri.draw(ctx);
        await sleep(1000);
        continue;
      }

      let isEar = true;

      // Does test ear contain any polygon vertices?
      for (let j = 0; j < vertices.length; j++) {
        if (j === a || j === b || j === c) {
          continue;
        }

        if (
          isPointInTriangle({
            p: vertices[j],
            triangle: { b: vb, a: va, c: vc },
          })
        ) {
          isEar = false;
          break;
        }
      }

      if (isEar) {
        foundTriangles.push(
          new Polygon([va, vb, vc], makeBrighter(poly.color))
        );
        indexList.splice(i, 1);
        break;
      }
    }
  }

  drawBackground(ctx);
  foundTriangles.forEach((tri) => tri.draw(ctx));
  getPolyFromIndexList(poly, indexList).draw(ctx);

  let va = poly.vertices[indexList[0]];
  let vb = poly.vertices[indexList[1]];
  let vc = poly.vertices[indexList[2]];

  const checkingTri = new Polygon([va, vb, vc], "rgba(50, 50, 250, 0.5)");
  checkingTri.draw(ctx);
  foundTriangles.push(new Polygon([va, vb, vc], makeBrighter(poly.color)));

  await sleep(1000);

  foundTriangles.forEach((tri) => tri.draw(ctx));
}
