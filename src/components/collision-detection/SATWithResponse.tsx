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
  const [response, setResponse] = useState(false);

  const toggleResponse = () => {
    setResponse((old) => !old);
  };
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
      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
      if (collision) {
        const responseVector = getResponseForCollision(myPoly1, myPoly2);
        const half = responseVector.multScalar(0.51);
        const halfNeg = responseVector.multScalar(-0.51);
        if (response) {
          myPoly1.translate(halfNeg);
          myPoly2.translate(half);
        } else {
          drawArrow(ctx, myPoly1.centroid(), myPoly1.centroid().add(halfNeg));
          drawArrow(ctx, myPoly2.centroid(), myPoly2.centroid().add(half));
        }
      }
    };

    const { cleanup } = instrument(ctx, [myPoly1, myPoly2], drawFn);
    return cleanup;
  }, [cnv, width, height, response, width, height]);

  return (
    <div className="SATWithResponseContainer">
      <SimpleReactCanvasComponent
        setCnv={setCnv}
        width={width}
        height={height}
      />
      <button onClick={toggleResponse}>
        Response: {response ? "ON" : "OFF"}
      </button>
    </div>
  );
};
