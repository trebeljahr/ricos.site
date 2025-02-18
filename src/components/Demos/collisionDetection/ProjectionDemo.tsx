import { useEffect, useState } from "react";
import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";

import {
  drawProjection,
  initPolygons,
  instrument,
  drawBackground,
} from "../../../lib/math/drawHelpers";
import { Vec2 } from "../../../lib/math/Vector";
export const ProjectionDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1] = initPolygons(ctx);

    const drawFn = () => {
      drawBackground(ctx);
      poly1.draw(ctx);
      const p1 = new Vec2(0, 2);
      const p2 = new Vec2(1, -2);
      drawProjection(ctx, poly1, p1, p2);
    };

    const { cleanup } = instrument(ctx, [poly1], drawFn);
    return cleanup;
  }, [cnv]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
