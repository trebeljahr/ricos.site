import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import {
  drawProjection,
  initPolygons,
  instrument,
} from "../../lib/math/drawHelpers";
import { Polygon } from "../../lib/math/Poly";
import { Vector2 } from "../../lib/math/vector";
import { colorEdge, drawBackground } from "./helpers";

export const AxisByAxis = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let axis = 0;
    let current = 0;

    const polys = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      polys.forEach((poly) => poly.draw(ctx));

      const pickEdge = (poly: Polygon) => {
        const i = axis;
        const i2 = (i + 1) % poly.vertices.length;
        return [poly.vertices[i], poly.vertices[i2]];
      };

      const [p1, p2] = pickEdge(polys[current]);

      drawProjection(
        cnv,
        polys,
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
      colorEdge(ctx, p1, p2);
    };

    const { cleanup } = instrument(cnv, polys, drawFn);
    const intervalId = setInterval(() => {
      axis++;
      if (axis >= polys[current].vertices.length) {
        current++;
        current = current >= polys.length ? 0 : current;
        axis = 0;
      }
    }, 1000);
    return () => {
      clearInterval(intervalId);
      cleanup;
    };
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};
