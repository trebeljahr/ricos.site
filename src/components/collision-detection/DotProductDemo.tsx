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

    const origin = new Vec2(cnv.width / 2, cnv.height / 2);
    const points = [new Vec2(1, 0), new Vec2(1, 1)].map((point) =>
      point.scale(Math.min(cnv.width, cnv.height) / 2).add(origin)
    );

    const arrows = points.map((point) => [origin, point]);

    const drawFn = () => {
      drawBackground(ctx);
      arrows.forEach(([a, b]) => {
        drawArrow(ctx, a, b);
      });
      ctx.font = "30px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(
        `${arrows[0][1].sub(origin).dot(arrows[1][1].sub(origin))}`,
        10,
        50
      );
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points: [origin, ...points],
    });
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
