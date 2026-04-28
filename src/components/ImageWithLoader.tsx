import dynamic from "next/dynamic";
import Image, { type ImageProps } from "next/image";
import { useCallback, useMemo, useState } from "react";

const Sparkles = dynamic(import("./Sparkles"), { ssr: false });

export const ImageWithLoader = ({ id, ...props }: Omit<ImageProps, "onLoadingComplete">) => {
  const [isSkeleton, setIsSkeleton] = useState(true);

  const onLoad = useCallback(() => {
    props.src !== "" && setIsSkeleton(false);
  }, [props.src]);

  // Without onError, a 404'd image leaves the skeleton spinning forever.
  const onError = useCallback(() => setIsSkeleton(false), []);

  const style = useMemo(() => ({ ...props.style }), [props.style]);

  // Next 16's `priority` no longer auto-sets fetchpriority=high; set it
  // explicitly so the browser actually treats the LCP image as urgent.
  const fetchPriority = props.fetchPriority ?? (props.priority ? "high" : undefined);

  return (
    <span className="block w-full h-full relative">
      <Image
        id={id}
        {...props}
        alt={props.alt}
        onLoad={onLoad}
        onError={onError}
        style={style}
        fetchPriority={fetchPriority}
      />

      {isSkeleton && (
        <span className="block absolute inset-0 overflow-hidden bg-gray-400 dark:bg-gray-700 cursor-wait w-full h-full">
          <Sparkles />
        </span>
      )}
    </span>
  );
};
