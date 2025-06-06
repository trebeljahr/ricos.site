import { useEffect, useState } from "react";
import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";

import {
  initPolygons,
  instrument,
  checkCollision,
  drawAllProjections,
  drawBackground,
} from "../../../lib/math/drawHelpers";
export const SAT = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1, poly2] = initPolygons(ctx);
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(poly1, poly2);
      drawAllProjections(ctx, poly1, poly2);
      poly1.draw(ctx, { collision });
      poly2.draw(ctx, { collision });
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn);
    return cleanup;
  }, [cnv]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
