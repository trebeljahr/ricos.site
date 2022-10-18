import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import { initPolygons, instrument } from "../../lib/math/drawHelpers";
import {
  checkCollision,
  drawAllProjections,
  drawArrow,
  drawBackground,
  getResponseForCollision,
} from "./helpers";

export const SATWithResponse = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [myPoly1, myPoly2] = initPolygons(cnv);
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(myPoly1, myPoly2);
      drawAllProjections(ctx, myPoly1, myPoly2);
      const response = getResponseForCollision(myPoly1, myPoly2);
      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
      if (collision) {
        drawArrow(ctx, myPoly1.centroid(), myPoly1.centroid().sub(response));
        drawArrow(ctx, myPoly2.centroid(), myPoly2.centroid().add(response));
        // myPoly1.translate(response.multScalar(-0.5));
        // myPoly2.translate(response.multScalar(0.5));
      }
    };

    const { cleanup } = instrument(ctx, [myPoly1, myPoly2], drawFn);
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
