import SimpleReactCanvasComponent from "@components/SimpleReactCanvasComponent";
import { useWindowSize } from "@react-hook/window-size";
import { useEffect, useState } from "react";
import { drawBackground } from "src/lib/math/drawHelpers";

export function DrawNeuron() {}

let MAX_ZOOM = 5;
let MIN_ZOOM = 0.1;
let SCROLL_SENSITIVITY = 0.0005;
let initialPinchDistance: number | null = null;
let cameraZoom = 1;
let lastZoom = cameraZoom;

export function useZoomControls(cnv: HTMLCanvasElement | null) {
  const [width, height] = useWindowSize();

  useEffect(() => {
    if (!cnv) return;
    cnv.style.touchAction = "none";

    const ctx = cnv.getContext("2d");
    if (!ctx || !width || !height) return;

    let cameraOffset = {
      x: width / 2,
      y: height / 2,
    };

    const getEventLocation = (e: TouchEvent | PointerEvent | MouseEvent) => {
      if (e instanceof TouchEvent && e.touches && e.touches.length == 1) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (
        (e instanceof PointerEvent || e instanceof MouseEvent) &&
        e.clientX &&
        e.clientY
      ) {
        return { x: e.clientX, y: e.clientY };
      }
      return { x: 0, y: 0 };
    };

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent | PointerEvent | TouchEvent) => {
      isDragging = true;
      dragStart.x = getEventLocation(e).x / cameraZoom - cameraOffset.x;
      dragStart.y = getEventLocation(e).y / cameraZoom - cameraOffset.y;
    };

    const onPointerUp = (e: MouseEvent | PointerEvent | TouchEvent) => {
      isDragging = false;
      initialPinchDistance = null;
      lastZoom = cameraZoom;
    };

    const onPointerMove = (e: MouseEvent | PointerEvent | TouchEvent) => {
      if (isDragging) {
        cameraOffset = {
          x: getEventLocation(e).x / cameraZoom - dragStart.x,
          y: getEventLocation(e).y / cameraZoom - dragStart.y,
        };
      }
    };

    const handleTouch = (
      e: TouchEvent,
      singleTouchHandler: (e: PointerEvent | TouchEvent | MouseEvent) => void
    ) => {
      console.log("Handling touch");
      if (e.touches.length === 1) {
        singleTouchHandler(e);
      } else if (e.type === "touchmove" && e.touches.length === 2) {
        isDragging = false;
        handlePinch(e);
      }
    };

    const handlePinch = (e: TouchEvent) => {
      e.preventDefault();

      let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

      let currentDistance =
        (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2;

      if (initialPinchDistance === null) {
        initialPinchDistance = currentDistance;
      } else {
        adjustZoom(null, currentDistance / initialPinchDistance);
      }
    };

    function adjustZoom(zoomAmount: number | null, zoomFactor?: number) {
      if (!isDragging) {
        if (zoomAmount) {
          cameraZoom += zoomAmount;
        } else if (zoomFactor) {
          cameraZoom = zoomFactor * lastZoom;
        }

        cameraZoom = Math.max(Math.min(cameraZoom, MAX_ZOOM), MIN_ZOOM);
      }
    }

    const handleTouchStart = (e: TouchEvent) => handleTouch(e, onPointerDown);
    const handleTouchEnd = (e: TouchEvent) => handleTouch(e, onPointerUp);
    const handleTouchMove = (e: TouchEvent) => handleTouch(e, onPointerMove);
    const handleWheel = (e: WheelEvent) =>
      adjustZoom(e.deltaY * SCROLL_SENSITIVITY);

    cnv.addEventListener("mousedown", onPointerDown);
    cnv.addEventListener("touchstart", handleTouchStart);
    cnv.addEventListener("mouseup", onPointerUp);
    cnv.addEventListener("touchend", handleTouchEnd);
    cnv.addEventListener("mousemove", onPointerMove);
    cnv.addEventListener("touchmove", handleTouchMove);
    cnv.addEventListener("wheel", handleWheel);

    let frameId: number;
    const scaleFn = () => {
      console.log("Running scale fn");
      ctx.translate(width / 2, height / 2);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-width / 2 + cameraOffset.x, -height / 2 + cameraOffset.y);
      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx);
      ctx.fillStyle = "#991111";
      ctx.rect(-50, -50, 100, 100);

      ctx.fillStyle = "#eecc77";
      ctx.rect(-35, -35, 20, 20);
      ctx.rect(15, -35, 20, 20);
      ctx.rect(-35, 15, 70, 20);

      frameId = requestAnimationFrame(scaleFn);
    };
    scaleFn();

    return () => {
      cnv.removeEventListener("mousedown", onPointerDown);
      cnv.removeEventListener("touchstart", handleTouchStart);
      cnv.removeEventListener("mouseup", onPointerUp);
      cnv.removeEventListener("touchend", handleTouchEnd);
      cnv.removeEventListener("mousemove", onPointerMove);
      cnv.removeEventListener("touchmove", handleTouchMove);
      cnv.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(frameId);
    };
  }, [cnv, height, width]);
}

export function NeuronDemo() {
  const [width, height] = useWindowSize();
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useZoomControls(cnv);

  // useEffect(() => {
  //   if (!cnv) return;
  //   const ctx = cnv.getContext("2d");
  //   if (!ctx || !width || !height) return;

  //   // let frameId: number;
  //   // const drawFn = () => {
  //   //   // console.log("Drawing circle");
  //   //   drawBackground(ctx);
  //   //   ctx.fillStyle = "blue";
  //   //   frameId = requestAnimationFrame(drawFn);
  //   //   // drawCoordinateSystem(ctx, scaleFactor);
  //   // };

  //   // drawFn();
  //   // return () => cancelAnimationFrame(frameId);
  // }, [cnv, width, height]);
  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
}
