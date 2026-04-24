import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";
import { useEffect, useState } from "react";

import { Polygon } from "../../../lib/math/Poly";
import {
  drawArrow,
  drawBackground,
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
} from "../../../lib/math/drawHelpers";
export const NormalDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1, poly2] = initPolygons(ctx, new Polygon(starPoints(), niceGreen));

    const drawNormals = (poly: Polygon) => {
      poly.draw(ctx);
      const normals = poly.edgeNormals();
      const midpoints = poly.edgeMidpoints();

      normals.forEach((normal, i) => {
        drawArrow(ctx, midpoints[i], midpoints[i].add(normal.multScalar(40)));
      });
    };

    const drawFn = () => {
      drawBackground(ctx);
      drawNormals(poly1);
      drawNormals(poly2);
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn, {
      convexityCheck: false,
    });
    return cleanup;
  }, [cnv]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
