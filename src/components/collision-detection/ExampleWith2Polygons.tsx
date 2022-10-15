import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import {
  drawProjection,
  initPolygons,
  instrument,
} from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { colorEdge, drawBackground } from "./helpers";

export const ExampleWith2Polygons = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [myPoly1, myPoly2] = initPolygons(cnv);

    const drawFn = () => {
      drawBackground(ctx);

      myPoly1.draw(ctx);
      myPoly2.draw(ctx);
      const [p1, p2] = [myPoly1.vertices[0], myPoly1.vertices[1]];
      colorEdge(ctx, p1, p2);
      drawProjection(
        cnv,
        [myPoly1, myPoly2],
        new Vector2(p1.y, -p1.x),
        new Vector2(p2.y, -p2.x)
      );
    };

    const { cleanup } = instrument(ctx, [myPoly1, myPoly2], drawFn);

    drawFn();

    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};
