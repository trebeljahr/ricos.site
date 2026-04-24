import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";
import { useEffect, useState } from "react";

import { Vec2 } from "../../../lib/math/Vector";
import { drawBackground, drawCoordinateSystem } from "../../../lib/math/drawHelpers";
export const SinAndCosineDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  const [angle, setAngle] = useState(0);

  useEffect(() => {
    setAngle((old) => old + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: verify dependency list manually
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    const width = cnv.clientWidth;
    const height = cnv.clientHeight;

    if (!width || !height) return;

    const scalingFactor = Math.min(width, height) / 10;
    const origin = new Vec2(width / 2, height / 2);
    const _a = new Vec2(4, 0).scale(scalingFactor).add(origin);

    drawBackground(ctx);
    drawCoordinateSystem(ctx, scalingFactor);
  }, [cnv, angle]);

  return <SimpleReactCanvasComponent setCnv={setCnv} />;
};
