import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
} from "../../lib/math/drawHelpers";
import { Polygon } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/vector";
import { drawArrow, drawBackground } from "./helpers";

export const DotProductDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1] = initPolygons(cnv);
    const arrows = poly1.vertices.map((vert) => [
      new Vec2(cnv.width / 2, cnv.height / 2),
      vert,
    ]);

    const drawFn = () => {
      drawBackground(ctx);
      arrows.forEach(([a, b]) => {
        drawArrow(ctx, a, b);
      });
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points: arrows.flat(),
    });
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
