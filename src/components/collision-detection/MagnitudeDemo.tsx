import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  instrument,
  niceBlue,
  niceGreen,
  drawArrow,
  drawBackground,
  drawCoordinateSystem,
  circle,
  line,
} from "../../lib/math/drawHelpers";
import { makeBrighter } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/Vector";

export const MagnitudeDemo = () => {
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
    const a = new Vec2(-1, -1).scale(scalingFactor).add(origin);

    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scalingFactor);

      ctx.strokeStyle = "black";
      drawArrow(ctx, origin, a);

      ctx.strokeStyle = niceBlue;
      line(ctx, origin, new Vec2(a.x, origin.y), { lineWidth: 3 });
      ctx.strokeStyle = niceGreen;
      line(ctx, new Vec2(a.x, origin.y), new Vec2(a.x, a.y), { lineWidth: 3 });
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points: [a],
    });
    return cleanup;
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
