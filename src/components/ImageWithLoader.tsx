import Image, { ImageProps } from "next/image";
import { useState } from "react";
import clsx from "clsx";
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
          "transition-opacity duration-200 opacity-0 h-full",
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
          onLoadingComplete={(img) => {
            console.log(img);
            console.log(props);

            props.src !== "" && setIsLoaded(true);
          }}
        />
      </div>

      {isSkeleton && (
        <div className="absolute inset-0 bg-gray-400 overflow-hidden">
          <ReactSparkle
            color="yellow"
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
