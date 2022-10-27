import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  circle,
  drawInfiniteLine,
  line,
  drawArrow,
  drawBackground,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";

export const ProjectArrowDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    drawBackground(ctx);

    const p1 = new Vec2(200, 200);
    const p2 = new Vec2(500, 50);
    const p3 = new Vec2(300, 300);
    drawArrow(ctx, p1, p2);
    drawInfiniteLine(ctx, p1, p3);

    const projection = p2.projectOnLine(p1, p3);
    ctx.fillStyle = "blue";
    circle(ctx, projection, 3);

    ctx.strokeStyle = "rgba(20, 20, 20, 0.2)";
    line(ctx, p2, projection);
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
