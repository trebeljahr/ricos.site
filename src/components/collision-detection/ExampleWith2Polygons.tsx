import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  drawProjection,
  getTranslationMatrix,
  initPolygons,
  instrument,
} from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { colorEdge, drawBackground } from "./helpers";

export const ExampleWith2Polygons = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1, poly2] = initPolygons(cnv);

    const drawFn = () => {
      if (!ctx) return;
      drawBackground(ctx);

      poly1.draw(ctx);
      poly2.draw(ctx);
      const [p1, p2] = [poly1.vertices[0], poly1.vertices[1]];
      colorEdge(ctx, p1, p2);
      drawProjection(
        ctx,
        [poly1, poly2],
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn);

    drawFn();

    return cleanup;
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
