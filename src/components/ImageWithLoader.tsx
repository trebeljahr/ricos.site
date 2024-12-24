import clsx from "clsx";
import dynamic from "next/dynamic";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

const Sparkles = dynamic(import("./Sparkles"), { ssr: false });

export const ImageWithLoader = ({
  css,
  ...props
}: { css?: string } & Omit<ImageProps, "onLoadingComplete">) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSkeleton, setIsSkeleton] = useState(true);

  return (
    <div className="relative w-full overflow-hidden h-full">
      <div
        className={clsx(
          "transition-opacity duration-200 h-full w-full relative z-10",
          // { "opacity-100": isLoaded },
          css
        )}
        onTransitionEnd={(event) => {
          event.propertyName === "opacity" && setIsSkeleton(false);
        }}
      >
        <Image
          {...props}
          alt={props.alt}
          onLoad={() => {
            props.src !== "" && setIsLoaded(true);
          }}
          style={
            props.fill
              ? props.style
              : { ...props.style, height: "auto", width: "auto" }
          }
        />
      </div>

      {isSkeleton && (
        <div className="absolute inset-0 overflow-hidden bg-gray-400 dark:bg-gray-700">
          <Sparkles />
        </div>
      )}
    </div>
  );
};
