import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import { initPolygons, instrument } from "../../lib/math/drawHelpers";
import { Vector2 } from "../../lib/math/vector";
import { drawBackground } from "./helpers";

export const Triangulation = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly] = initPolygons(cnv);

    poly.centerOnPoint(new Vector2(cnv.width / 2, cnv.height / 2));

    const drawFn = () => {
      drawBackground(ctx);
      poly.draw(ctx);

      const triangles = poly.triangulate();
      triangles.forEach((tri) => tri.draw(ctx));
    };

    const { cleanup } = instrument(ctx, [poly], drawFn, {
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
