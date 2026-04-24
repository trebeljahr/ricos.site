import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";
import { useEffect, useState } from "react";

import { useWindowWidth } from "@react-hook/window-size";
import { Polygon, triangulateVisualization } from "../../../lib/math/Poly";
import { Vec2 } from "../../../lib/math/Vector";
import {
  drawBackground,
  initPolygons,
  instrument,
  niceGreen,
  starPoints,
} from "../../../lib/math/drawHelpers";
export const EarClipping = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  //
  const [visualizing, setVisualizing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const windowWidth = useWindowWidth();

  const [poly, setPoly] = useState<Polygon | null>(null);
  const toggleVisualization = () => {
    setVisualizing(!visualizing);
  };

  useEffect(() => {
    if (!cnv || !poly) return;

    poly.centerOnPoint(new Vec2(cnv.clientWidth / 2, cnv.clientHeight / 2));
  }, [windowWidth, poly, cnv]);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    if (!poly) {
      const [poly1] = initPolygons(ctx, new Polygon(starPoints(), niceGreen));
      poly1.centerOnPoint(new Vec2(cnv.clientWidth / 2, cnv.clientHeight / 2));
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

      const indexList: number[] = [];
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
    <div>
      <SimpleReactCanvasComponent setCnv={setCnv} id="ear-clipping" />
      <button type="button" onClick={toggleVisualization} aria-label="Toggle Visualization">
        Visualizing: {visualizing ? "ON" : "OFF"}
      </button>
    </div>
  );
};
