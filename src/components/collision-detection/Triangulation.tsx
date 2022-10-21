import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import { initPolygons, instrument } from "../../lib/math/drawHelpers";
import {
  checkCollision,
  drawAllProjections,
  drawBackground,
  visualizeCollision,
} from "./helpers";

export const Triangulation = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [poly] = initPolygons(cnv);
    const drawFn = () => {
      drawBackground(ctx);
      poly.draw(ctx);
    };

    const { cleanup } = instrument(ctx, [poly], drawFn);
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
