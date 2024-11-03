import Image, { ImageProps } from "next/image";
import { useState } from "react";
import clsx from "clsx";

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
          onLoadingComplete={() => setIsLoaded(true)}
        />
      </div>

      {isSkeleton && (
        <div className="absolute inset-0 bg-gray-400 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <style jsx>{`
            @keyframes shimmer {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
            .animate-shimmer {
              animation: shimmer 2s infinite linear;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
