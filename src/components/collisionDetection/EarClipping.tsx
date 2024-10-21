import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
  drawBackground,
} from "../../lib/math/drawHelpers";
import { Polygon, triangulateVisualization } from "../../lib/math/Poly";
import { Vec2 } from "../../lib/math/Vector";
export const EarClipping = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();
  const [visualizing, setVisualizing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const [poly, setPoly] = useState<Polygon | null>(null);
  const toggleVisualization = () => {
    setVisualizing(!visualizing);
  };

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    if (!poly) {
      const [poly1] = initPolygons(ctx, new Polygon(starPoints(), niceGreen));
      poly1.centerOnPoint(new Vec2(cnv.width / 2, cnv.height / 2));
      setPoly(poly1);
      return;
    }

    if (!visualizing) {
      const drawFn = () => {
        drawBackground(ctx);
        poly.draw(ctx);
      };
      const { cleanup } = instrument(ctx, [poly], drawFn, {
        convexityCheck: false,
      });
      return cleanup;
    }

    const visualize = () => {
      if (isRunning) return;
      setIsRunning(true);

      let indexList: number[] = [];
      for (let i = 0; i < poly.vertices.length; i++) {
        indexList.push(i);
      }

      triangulateVisualization(ctx, poly, indexList).then(() => {
        setIsRunning(false);
      });
    };

    visualize();
  }, [cnv, visualizing, poly, isRunning]);

  return (
    <div className="SATWithResponseContainer">
      <SimpleReactCanvasComponent
        setCnv={setCnv}
        width={width}
        height={height}
      />
      <button onClick={toggleVisualization} aria-label="Toggle Visualization">
        Visualizing: {visualizing ? "ON" : "OFF"}
      </button>
    </div>
  );
};
