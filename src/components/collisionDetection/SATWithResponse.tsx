import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
  checkCollision,
  drawAllProjections,
  drawBackground,
  visualizeCollision,
} from "../../lib/math/drawHelpers";
import { Polygon } from "../../lib/math/Poly";

export const SATWithResponse = ({
  drawProjections = true,
  changeColorOnCollision = true,
  responseToggle = true,
  withStar = false,
}) => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();
  const [response, setResponse] = useState(!responseToggle);

  const toggleResponse = () => {
    setResponse((old) => !old);
  };

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1, poly2] = initPolygons(
      ctx,
      withStar ? new Polygon(starPoints(), niceGreen) : undefined
    );
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(poly1, poly2);
      drawProjections && drawAllProjections(ctx, poly1, poly2);
      poly1.draw(ctx, { collision: changeColorOnCollision && collision });
      poly2.draw(ctx, { collision: changeColorOnCollision && collision });
      if (collision) {
        visualizeCollision(ctx, poly1, poly2, response);
      }
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn, {
      convexityCheck: !withStar,
    });
    return cleanup;
  }, [
    cnv,
    width,
    height,
    response,
    drawProjections,
    changeColorOnCollision,
    withStar,
  ]);

  return (
    <div className="SATWithResponseContainer">
      <SimpleReactCanvasComponent
        setCnv={setCnv}
        width={width}
        height={height}
      />
      {responseToggle && (
        <button onClick={toggleResponse}>
          Response: {response ? "ON" : "OFF"}
        </button>
      )}
    </div>
  );
};
