import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  drawProjection,
  initPolygons,
  instrument,
  colorEdge,
  drawBackground,
} from "../../lib/math/drawHelpers";
import { Polygon } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/Vector";
import React from "react";

export const AxisByAxis = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    let axis = 0;
    let current = 0;

    const polys = initPolygons(ctx);

    const drawFn = () => {
      if (!ctx || !ctx.canvas) return;
      drawBackground(ctx);

      polys.forEach((poly) => poly.draw(ctx));

      const pickEdge = (poly: Polygon) => {
        const i = axis;
        const i2 = (i + 1) % poly.vertices.length;
        return [poly.vertices[i], poly.vertices[i2]];
      };

      const [p1, p2] = pickEdge(polys[current]);

      drawProjection(ctx, polys, new Vec2(p1.y, -p1.x), new Vec2(p2.y, -p2.x));
      colorEdge(ctx, p1, p2);
    };

    const { cleanup } = instrument(ctx, polys, drawFn);
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
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
