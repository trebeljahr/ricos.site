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
  visualizeCollision,
} from "./helpers";

export const SATWithResponse = ({
  drawProjections = true,
  responseToggle = true,
}: {
  drawProjections?: boolean;
  responseToggle?: boolean;
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

    const [poly1, poly2] = initPolygons(cnv);
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(poly1, poly2);
      drawProjections && drawAllProjections(ctx, poly1, poly2);
      poly1.draw(ctx, { collision: drawProjections && collision });
      poly2.draw(ctx, { collision: drawProjections && collision });
      if (collision) {
        visualizeCollision(ctx, poly1, poly2, response);
      }
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn);
    return cleanup;
  }, [cnv, width, height, response, drawProjections]);

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
