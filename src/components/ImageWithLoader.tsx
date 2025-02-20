import clsx from "clsx";
import dynamic from "next/dynamic";
import Image, { ImageProps } from "next/image";
import { useMemo, useCallback, useState } from "react";

const Sparkles = dynamic(import("./Sparkles"), { ssr: false });

export const ImageWithLoader = ({
  id,
  ...props
}: Omit<ImageProps, "onLoadingComplete">) => {
  const [isSkeleton, setIsSkeleton] = useState(true);

  const onLoad = useCallback(() => {
    props.src !== "" && setIsSkeleton(false);
  }, [props.src]);

  const style = useMemo(() => ({ ...props.style }), [props.style]);

  return (
    <div className="w-full h-full relative">
      <Image id={id} {...props} alt={props.alt} onLoad={onLoad} style={style} />

      {isSkeleton && (
        <div className="absolute inset-0 overflow-hidden bg-gray-400 dark:bg-gray-700 cursor-wait w-full h-full">
          <Sparkles />
        </div>
      )}
    </div>
  );
};
