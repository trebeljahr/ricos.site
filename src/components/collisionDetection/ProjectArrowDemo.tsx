import { useEffect, useState } from "react";
import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";

import {
  circle,
  drawInfiniteLine,
  line,
  drawArrow,
  drawBackground,
  instrument,
  drawCoordinateSystem,
  niceBlue,
  niceGreen,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";
export const ProjectArrowDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    const width = cnv.clientWidth;
    const height = cnv.clientHeight;

    if (!width || !height) return;

    let p1 = new Vec2(width / 3, width / 3);
    let p2 = new Vec2(width / 2, width / 10);
    let p3 = new Vec2(width / 2.5, width / 2.5);

    const scaleFactor = Math.floor(Math.max(width, height) / 30);
    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scaleFactor);
      ctx.font = "20px Arial";

      ctx.strokeStyle = "black";
      drawInfiniteLine(ctx, p1, p3, "black");

      const projection = p2.projectOnLine(p1, p3);

      ctx.strokeStyle = "black";
      line(ctx, p2, projection);

      ctx.fillStyle = niceGreen;
      circle(ctx, projection, 3);

      ctx.strokeStyle = niceGreen;
      drawArrow(ctx, p1, p2);

      ctx.fillStyle = "black";
      ctx.fillText("a", p1.x - 5, p1.y + 25);
      ctx.fillText("b", p3.x - 5, p3.y + 25);
      ctx.fillText("c", p2.x - 5, p2.y + 25);

      ctx.fillStyle = niceBlue;
      circle(ctx, p1, 5);
      circle(ctx, p3, 5);
    };

    const { cleanup } = instrument(ctx, [], drawFn, {
      points: [p1, p2, p3],
      convexityCheck: false,
    });
    return cleanup;
  }, [cnv]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
