import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { useActualSize } from "../../hooks/useWindowSize";

export const CircleOfFifths = () => {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const { width, height } = useActualSize();

  useEffect(() => {
    if (!cnv || !width || !height) return;

    cnv.width = width;
    cnv.height = height;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const canvas = cnv;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const majorRadius = 200;
    const minorRadius = majorRadius / 1.5;
    const notes = [
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "G♭/F♯",
      "D♭",
      "A♭",
      "E♭",
      "B♭",
      "F",
    ];
    const minorNotes = [
      "a",
      "e",
      "b",
      "f♯",
      "c♯",
      "g♯",
      "e♭/d♯",
      "b♭",
      "f",
      "c",
      "g",
      "d",
    ];

    const drawSegment = (
      centerX: number,
      centerY: number,
      radius: number,
      index: number,
      label: string
    ) => {
      // Adjust the starting angle to -90 degrees
      const startAngle = ((index * 30 - 105) * Math.PI) / 180;
      const endAngle = startAngle + Math.PI / 6;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${index * 30}, 70%, 60%)`;
      ctx.fill();

      // Draw label
      ctx.font = "16px Arial";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textX =
        centerX + (radius / 1.1) * Math.cos(startAngle + Math.PI / 12);
      const textY =
        centerY + (radius / 1.1) * Math.sin(startAngle + Math.PI / 12);
      ctx.fillText(label, textX, textY);
    };

    // Draw Major Circle
    for (let i = 0; i < notes.length; i++) {
      drawSegment(centerX, centerY, majorRadius, i, notes[i]);
    }

    // Draw Minor Circle
    for (let i = 0; i < minorNotes.length; i++) {
      drawSegment(centerX, centerY, minorRadius, i, minorNotes[i]);
    }

    const isInsideSegment = (
      mouseX: number,
      mouseY: number,
      startAngle: number,
      endAngle: number,
      radius: number
    ) => {
      const distanceFromCenter = Math.sqrt(
        Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
      );
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX);

      return (
        distanceFromCenter <= radius && angle >= startAngle && angle <= endAngle
      );
    };

    const clickHandler = (event: MouseEvent) => {
      const rect = cnv.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      for (let i = 0; i < notes.length; i++) {
        const startAngle = (i * 30 * Math.PI) / 180;
        const endAngle = startAngle + Math.PI / 6;

        if (
          isInsideSegment(mouseX, mouseY, startAngle, endAngle, majorRadius)
        ) {
          alert("Clicked on note: " + notes[i]);
          break;
        }
        if (
          isInsideSegment(mouseX, mouseY, startAngle, endAngle, minorRadius)
        ) {
          alert("Clicked on note: " + minorNotes[i]);
          break;
        }
      }
    };
    cnv.addEventListener("click", clickHandler);

    return () => {
      cnv.removeEventListener("click", clickHandler);
    };
  }, [cnv, width, height]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={width} height={height} />
  );
};
