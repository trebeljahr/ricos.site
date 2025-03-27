import SimpleReactCanvasComponent from "@components/SimpleReactCanvasComponent";
import { useWindowSize } from "@react-hook/window-size";
import { useEffect, useState } from "react";
import { Point } from "src/lib/math/datasets/utils";
import {
  circle,
  drawBackground,
  drawCoordinateSystem,
} from "src/lib/math/drawHelpers";
import { Vec2 } from "src/lib/math/Vector";

function mapToDataSets(datasets: [Vec2[], Vec2[]]) {
  return [
    {
      data: datasets[0],
      color: "rgba(255, 99, 132, 1)",
    },
    {
      data: datasets[1],
      color: "rgba(50, 99, 255, 1)",
    },
  ];
}

function plotDatasets(ctx: CanvasRenderingContext2D, datasets: Dataset[]) {
  for (let dataset of datasets) {
    plotDataset(ctx, dataset);
  }
}

function plotDataset(ctx: CanvasRenderingContext2D, dataset: Dataset) {
  ctx.fillStyle = dataset.color;
  for (let point of dataset.data) {
    circle(ctx, new Vec2(point.x, point.y), 5);
  }
}

type Dataset = {
  data: Vec2[];
  color: string;
};

type Props = {
  data: [Point[], Point[]];
};

export function Plot({ data }: Props) {
  const [width, height] = useWindowSize();

  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cnv) return;
    const ctx = cnv.getContext("2d");
    if (!ctx || !width || !height) return;

    const origin = new Vec2(width / 2, height / 2);
    const scaleFactor = Math.floor(Math.max(width, height) / 20);

    const vecData = data.map((points) =>
      points.map(({ x, y }) => new Vec2(x, y).scale(scaleFactor).add(origin))
    ) as [Vec2[], Vec2[]];

    const drawFn = () => {
      drawBackground(ctx);
      drawCoordinateSystem(ctx, scaleFactor);
      plotDatasets(ctx, mapToDataSets(vecData));
    };

    drawFn();
  }, [cnv, width, height, data]);
  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
}
