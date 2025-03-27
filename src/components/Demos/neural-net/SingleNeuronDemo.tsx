import { useEffect, useState } from "react";
import { F, Value } from "./Value";
import { Vec2 } from "src/lib/math/Vector";
import { circle, line } from "src/lib/math/drawHelpers";
import { useWindowSize } from "@react-hook/window-size";

function visualizeNeuron(
  ctx: CanvasRenderingContext2D,
  { children: childrenSet, operation, grad, data }: Value,
  position: Vec2,
  shorten = false
) {
  const children = [...childrenSet];
  const offsetY = 150;
  const newPosition = position.sub(
    new Vec2(200, (children.length * offsetY) / 4)
  );
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const nextPos = newPosition.add(
      new Vec2(shorten ? 100 : 0, (offsetY * i) / 2)
    );
    line(ctx, position, nextPos);
    visualizeNeuron(ctx, child, nextPos, i % 2 === 0);
  }

  circle(ctx, position, 30);
  ctx.fillText(operation, position.x, position.y);
  ctx.fillText(`grad: ${grad}`, position.x, position.y + 20);
  ctx.fillText(`data: ${data}`, position.x, position.y + 40);
}

export function SingleNeuronDemo() {
  const [width, height] = useWindowSize();
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  console.log(F);

  useEffect(() => {
    if (!cnv) return;
    const ctx = cnv.getContext("2d");
    if (!ctx || !width || !height) return;

    const origin = new Vec2(width / 2, height / 2);
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const drawFn = () => {
      visualizeNeuron(ctx, F, new Vec2(width - 100, height - 100));
    };

    drawFn();
  }, [cnv, width, height]);

  return null;
}
