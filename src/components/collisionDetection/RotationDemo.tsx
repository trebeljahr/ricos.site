import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SimpleReactCanvasComponent } from "@components/SimpleReactCanvasComponent";

import {
  drawArrow,
  drawBackground,
  drawCoordinateSystem,
} from "../../lib/math/drawHelpers";
import { Vec2 } from "../../lib/math/Vector";

const ReactSlider = dynamic(() => import("react-slider"), { ssr: false });

export const RotationDemo = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  const [slider, setSlider] = useState(0);

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
    let a = new Vec2(4, 0).scale(scalingFactor).add(origin);
    drawBackground(ctx);
    drawCoordinateSystem(ctx, scalingFactor);

    ctx.fillStyle = "rgb(153, 204, 255)";
    ctx.strokeStyle = "black";

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.arc(origin.x, origin.y, a.mag() / 8, 0, slider);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    ctx.strokeStyle = "black";
    drawArrow(ctx, origin, a.sub(origin).rotate(slider).add(origin));
  }, [cnv, slider]);

  return (
    <>
      <br />
      <SimpleReactCanvasComponent setCnv={setCnv} />
      <ReactSlider
        onChange={(value) => {
          setSlider(((value as number) / 100) * Math.PI * 2);
        }}
        renderMark={(props) => <div {...props} key={props.key} className="" />}
        renderTrack={(props) => <div {...props} key={props.key} className="" />}
        renderThumb={(props) => <div {...props} key={props.key} className="" />}
      />
      <div className="slider-annotation">
        <p>0</p>
        <p>2*π</p>
      </div>
    </>
  );
};
