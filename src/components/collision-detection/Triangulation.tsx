import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import { initPolygons, instrument } from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { checkCollision, drawBackground } from "./helpers";

export const Triangulation = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly1, poly2] = initPolygons(cnv);

    poly1.centerOnPoint(new Vector2(cnv.width / 2, cnv.height / 2));

    const drawFn = () => {
      drawBackground(ctx);
      // poly1.draw(ctx);
      poly2.draw(ctx);
      if (poly1.isConvex()) {
        poly1.draw(ctx);
      } else {
        poly1.triangles.forEach((tri) => {
          const collision = checkCollision(tri, poly2);
          tri.draw(ctx, { collision });
        });
      }
    };

    const { cleanup } = instrument(ctx, [poly1, poly2], drawFn, {
      convexityCheck: false,
    });
    return cleanup;
  }, [cnv]);

  return (
    <div className="SATWithResponseContainer">
      <SimpleReactCanvasComponent
        setCnv={setCnv}
        width={width}
        height={height}
      />
    </div>
  );
};
