import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  drawArrow,
  drawBackground,
  drawCoordinateSystem,
  instrument,
  line,
  niceBlue,
  niceGreen,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";

function drawCross(ctx: CanvasRenderingContext2D, c: Vec2) {
  line(ctx, new Vec2(c.x - 10, c.y - 10), new Vec2(c.x + 10, c.y + 10));
  line(ctx, new Vec2(c.x - 10, c.y + 10), new Vec2(c.x + 10, c.y - 10));
}

export const PointAndVectorDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    if (!width || !height) return;

    const scalingFactor = Math.min(width, height) / 10;
    const origin = new Vec2(width / 2, height / 2);
    let a = new Vec2(3, -2).scale(scalingFactor).add(origin);

    let c = new Vec2(-2, 4).scale(scalingFactor).add(origin);

    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scalingFactor);
      ctx.strokeStyle = niceGreen;
      const b = new Vec2(a.x - scalingFactor * 2, a.y + scalingFactor * 2);
      drawArrow(ctx, b, a);

      ctx.strokeStyle = niceBlue;
      drawArrow(ctx, origin, c);

      ctx.strokeStyle = "red";
      drawArrow(ctx, origin, a.sub(b).add(origin));

      ctx.strokeStyle = "black";
      drawArrow(ctx, c, a.sub(b).add(c));

      ctx.strokeStyle = "black";

      drawCross(ctx, c);
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points: [a, c],
    });
    return cleanup;
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
