import { ImageWithLoader } from "@components/ImageWithLoader";
import { useEffect, useRef, useState } from "react";
import { RenderImageProps, RenderImageContext } from "react-photo-album";
import { ImageProps } from "src/@types";

type PhotoWithId = ImageProps & { id: string; index: number };

export function CustomImageRenderer(
  props: RenderImageProps,
  context: RenderImageContext<PhotoWithId>
) {
  const { photo, width: renderedWidth, height: renderedHeight } = context;
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState<
    { width: number; height: number } | undefined
  >(undefined);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;

      setDimensions((prev) => {
        if (prev?.width === w && prev?.height === h) return prev;
        return { width: w, height: h };
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      key={photo.id}
      ref={containerRef}
      className="block relative"
      style={{ width: renderedWidth, height: renderedHeight }}
    >
      {dimensions && (
        <ImageWithLoader
          onClick={props.onClick}
          id={photo.id}
          src={photo.src}
          alt={
            photo.src.split("/").pop()?.replace("-", " ") ||
            "sorry but this photo doesn't have an alt text"
          }
          width={dimensions.width}
          height={dimensions.height}
          style={{ width: "100%", height: "auto" }}
        />
      )}
    </div>
  );
}
