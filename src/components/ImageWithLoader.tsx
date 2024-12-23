import clsx from "clsx";
import Image, { ImageProps } from "next/image";
import { useState } from "react";
import ReactSparkle from "react-sparkle";

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
          "transition-opacity duration-200 opacity-0 h-full w-full relative",
          { "opacity-100": isLoaded },
          css
        )}
        onTransitionEnd={(event) =>
          event.propertyName === "opacity" && setIsSkeleton(false)
        }
      >
        <Image
          {...props}
          alt={props.alt}
          onLoad={() => {
            props.src !== "" && setIsLoaded(true);
          }}
          style={props.fill ? {} : { height: "auto", width: "auto" }}
        />
      </div>

      {isSkeleton && (
        <div className="absolute inset-0 overflow-hidden bg-gray-200 dark:bg-gray-700">
          <ReactSparkle
            color="teal"
            count={20}
            minSize={5}
            maxSize={16}
            fadeOutSpeed={15}
            flicker={false}
          />
        </div>
      )}
    </div>
  );
};
