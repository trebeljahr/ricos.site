import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import { initPolygons, instrument } from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/vector";
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

    poly1.centerOnPoint(new Vec2(cnv.width / 2, cnv.height / 2));

    const drawFn = () => {
      drawBackground(ctx);
      // poly1.draw(ctx);

      let collision = false;
      if (poly1.isConvex()) {
        collision = checkCollision(poly1, poly2);
        poly1.draw(ctx, { collision });
      } else {
        poly1.draw(ctx);
        poly1.triangles.forEach((tri) => {
          const collision = checkCollision(tri, poly2);
          tri.draw(ctx, { collision });
        });
      }

      poly2.draw(ctx, { collision });
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
