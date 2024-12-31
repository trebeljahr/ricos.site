import { useEffect, useState } from "react";
import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";

import {
  instrument,
  niceBlue,
  niceGreen,
  drawArrow,
  drawBackground,
  drawCoordinateSystem,
  line,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";

export const MagnitudeDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const width = cnv.clientWidth;
    const height = cnv.clientHeight;

    const scalingFactor = Math.min(width, height) / 10;
    const origin = new Vec2(width / 2, height / 2);
    const a = new Vec2(4, -3).scale(scalingFactor).add(origin);
    ctx.font = "30px KaTeX_Main";

    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scalingFactor);

      ctx.save();
      ctx.lineWidth = 5;
      ctx.lineCap = "round";

      ctx.strokeStyle = niceBlue;
      line(ctx, origin, new Vec2(a.x, origin.y));
      ctx.strokeStyle = niceGreen;
      line(ctx, new Vec2(a.x, origin.y), new Vec2(a.x, a.y));

      ctx.fillStyle = niceBlue;
      const realX = (a.x - origin.x) / scalingFactor;
      ctx.fillText(`x = ${realX.toFixed(1)}`, 10, 50);

      ctx.fillStyle = niceGreen;
      const realY = (a.y - origin.y) / -scalingFactor;
      ctx.fillText(`y = ${realY.toFixed(1)}`, 10, 100);

      ctx.fillStyle = "black";
      const mag2 = realX * realX + realY * realY;
      ctx.fillText(
        `∥v∥² = ${realX.toFixed(1)}² + ${realY.toFixed(1)}² = ${mag2.toFixed(
          1
        )}`,
        10,
        150
      );
      const mag = Math.sqrt(mag2);
      ctx.fillText(`∥v∥ = ${mag.toFixed(1)}`, 10, 200);

      ctx.restore();

      ctx.strokeStyle = "black";
      drawArrow(ctx, origin, a);
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      convexityCheck: false,
      points: [a],
    });
    return cleanup;
  }, [cnv]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
