import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { circle, drawInfiniteLine, line } from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { drawArrow, drawBackground } from "./helpers";

export const MatrixDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    drawBackground(ctx);

    const p1 = new Vector2(200, 200);
    const p2 = new Vector2(500, 50);
    const p3 = new Vector2(300, 300);
    drawArrow(ctx, p1, p2);
    drawInfiniteLine(ctx, p1, p3);

    const projection = p2.projectOnLine(p1, p3);
    ctx.fillStyle = "blue";
    circle(ctx, projection, 3);

    ctx.strokeStyle = "rgba(20, 20, 20, 0.2)";
    line(ctx, p2, projection);
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};
