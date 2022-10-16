import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import {
  drawProjection,
  initPolygons,
  instrument,
} from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { drawBackground } from "./helpers";

export const ProjectionDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);
      poly1.draw(ctx);
      const p1 = new Vector2(0, 2);
      const p2 = new Vector2(1, -2);
      drawProjection(ctx, poly1, p1, p2);
    };

    const { cleanup } = instrument(ctx, [poly1], drawFn);
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};
