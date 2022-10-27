import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
  checkCollision,
  drawBackground,
  getResponseForCollision,
} from "../../lib/math/drawHelpers";
import { Polygon } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/Vector";

export const Triangulation = ({ responseToggle = true, drawTris = true }) => {
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
      new Polygon(starPoints(), niceGreen)
    );

    poly1.centerOnPoint(new Vec2(cnv.width / 2, cnv.height / 2));

    const drawFn = () => {
      drawBackground(ctx);

      let collision = false;
      if (poly1.isConvex()) {
        collision = checkCollision(poly1, poly2);
        poly1.draw(ctx, { collision });
      } else {
        poly1.draw(ctx);
        poly1.triangles.forEach((tri) => {
          const collision = checkCollision(tri, poly2);
          drawTris && tri.draw(ctx, { collision });
          if (collision && response) {
            const responseVector = getResponseForCollision(tri, poly2);
            const half = responseVector.multScalar(0.51);
            const halfNeg = responseVector.multScalar(-0.51);
            if (response) {
              poly1.translate(halfNeg);
              poly2.translate(half);
            }
          }
        });
      }

      poly2.draw(ctx, { collision });
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn, {
      convexityCheck: false,
    });
    return cleanup;
  }, [cnv, response, drawTris]);

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
