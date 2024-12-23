import { ImageWithLoader } from "@components/ImageWithLoader";
import { useEffect, useRef, useState } from "react";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/@types";

export function NextJsImage({
  photo,
  imageProps,
  wrapperStyle,
}: RenderPhotoProps<ImageProps & { id: string; index: number }>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState<
    { width: number; height: number } | undefined
  >(undefined);

  useEffect(() => {
    const w = containerRef.current?.clientWidth;
    const h = containerRef.current?.clientHeight;
    if (!w || !h) return;

    setDimensions({ width: w, height: h });
  }, [containerRef.current?.clientWidth]);

  return (
    <div
      key={photo.id}
      ref={containerRef}
      className="block relative bg-slate-50"
      style={{ ...wrapperStyle }}
    >
      {dimensions && (
        <ImageWithLoader
          onClick={imageProps.onClick}
          id={photo.id}
          src={photo}
          alt=""
          width={dimensions.width}
          height={dimensions.height}
        />
      )}
    </div>
  );
}
