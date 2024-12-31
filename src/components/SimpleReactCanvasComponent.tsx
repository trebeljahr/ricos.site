import { useWindowWidth } from "@react-hook/window-size";
import clsx from "clsx";
import {
  Dispatch,
  HTMLAttributes,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

type CanvasProps = {
  width?: number;
  height?: number;
  setCnv: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
} & HTMLAttributes<HTMLCanvasElement>;

export const SimpleReactCanvasComponent = ({
  setCnv,
  ...props
}: CanvasProps) => {
  const windowWidth = useWindowWidth();

  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState<number>();

  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCnv(canvas);

    setWidth(canvas.parentElement?.clientWidth);
    setHeight(500);
  }, [windowWidth]);

  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv || !width || !height) return;

    const ratio = Math.ceil(window.devicePixelRatio);
    cnv.width = width * ratio;
    cnv.height = height * ratio;
    cnv.style.width = `${width}px`;
    cnv.style.height = `${height}px`;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }, [width, height, canvasRef]);

  //   if (!width || !height) return null;

  return (
    <canvas
      tabIndex={0}
      ref={canvasRef}
      width={width}
      height={height}
      {...props}
      className={clsx(props.className, "cursor-pointer my-10")}
    />
  );
};

export default SimpleReactCanvasComponent;
