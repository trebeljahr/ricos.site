import clsx from "clsx";
import dynamic from "next/dynamic";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

const Sparkles = dynamic(import("./Sparkles"), { ssr: false });

export const ImageWithLoader = ({
  id,
  ...props
}: Omit<ImageProps, "onLoadingComplete">) => {
  const [isSkeleton, setIsSkeleton] = useState(true);

  return (
    <div className="relative w-full overflow-hidden h-full" id={id}>
      <div
        className={clsx(
          "transition-opacity duration-200 h-full w-full relative z-10 cursor-pointer"
        )}
      >
        <Image
          {...props}
          alt={props.alt}
          onLoad={() => {
            props.src !== "" && setIsSkeleton(false);
          }}
          style={
            props.fill
              ? props.style
              : { ...props.style, height: "auto", width: "auto" }
          }
        />
      </div>

      {isSkeleton && (
        <div className="absolute inset-0 overflow-hidden bg-gray-400 dark:bg-gray-700 cursor-wait">
          <Sparkles />
        </div>
      )}
    </div>
  );
};
