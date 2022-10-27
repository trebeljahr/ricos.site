import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  instrument,
  niceBlue,
  niceGreen,
  toDegrees,
  drawArrow,
  drawBackground,
  drawCoordinateSystem,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";

export const DotProductDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    if (!width || !height) return;

    const scalingFactor = Math.min(width, height) / 3;
    const origin = new Vec2(width / 2, height / 2);
    const points = [new Vec2(1, 0), new Vec2(1, 1)].map((point) =>
      point.scale(scalingFactor).add(origin)
    );

    const arrows = points.map((point) => [origin, point]);

    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scalingFactor / 10);

      const a = arrows[0][1].sub(origin).scale((1 / scalingFactor) * 10);
      a.y = -a.y;
      ctx.strokeStyle = niceGreen;
      drawArrow(ctx, origin, arrows[0][1]);

      const b = arrows[1][1].sub(origin).scale((1 / scalingFactor) * 10);
      b.y = -b.y;

      ctx.strokeStyle = niceBlue;
      drawArrow(ctx, origin, arrows[1][1]);
      const dot = a.dot(b);

      ctx.font = "30px Arial";

      ctx.fillStyle = "black";
      ctx.fillText(`${dot.toFixed(1)}`, 10, 50);

      const degrees = toDegrees(Math.acos(dot / (a.mag() * b.mag())));
      ctx.fillText(`${degrees.toFixed(1)}°`, 10, 100);

      ctx.fillStyle = niceGreen;
      ctx.fillText(`${a.x.toFixed(1)} ${a.y.toFixed(1)}`, 10, 150);
      ctx.fillStyle = niceBlue;
      ctx.fillText(`${b.x.toFixed(1)} ${b.y.toFixed(1)}`, 10, 200);
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points,
    });
    return cleanup;
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
