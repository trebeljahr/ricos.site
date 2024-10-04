import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";
import {
  drawBackground,
  drawCoordinateSystem,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";
export const SinAndCosineDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    setAngle((old) => old + 1);
  }, []);

  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    if (!width || !height) return;

    const scalingFactor = Math.min(width, height) / 10;
    const origin = new Vec2(width / 2, height / 2);
    let a = new Vec2(4, 0).scale(scalingFactor).add(origin);

    drawBackground(ctx);
    drawCoordinateSystem(ctx, scalingFactor);
  }, [cnv, width, height, angle]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
