import clsx from "clsx";
import dynamic from "next/dynamic";
import Image, { type ImageProps } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const Sparkles = dynamic(() => import("./Sparkles"), { ssr: false });

// One observer for every skeleton on a page: /booknotes has 139 of them.
let skeletonObserver: IntersectionObserver | undefined;
const skeletonListeners = new WeakMap<Element, (inView: boolean) => void>();

const watchSkeleton = (element: Element, onChange: (inView: boolean) => void) => {
  skeletonObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) skeletonListeners.get(entry.target)?.(entry.isIntersecting);
  });
  skeletonListeners.set(element, onChange);
  skeletonObserver.observe(element);
  return () => {
    skeletonObserver?.unobserve(element);
    skeletonListeners.delete(element);
  };
};

// Sparkles re-render on a 30-300 ms timer and spin a dozen SVGs, and a lazy
// image far down the page stays unloaded until the reader gets there. Run them
// only where someone can see them: with one set per image, /booknotes at 4x CPU
// throttling kept the main thread busy for 9.99 s of every 10 s while idle.
const ImageSkeleton = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => (ref.current ? watchSkeleton(ref.current, setInView) : undefined), []);

  return (
    // Behind the image, not over it: the browser paints a loaded image as soon
    // as it has the bytes, without waiting for hydration to remove this box.
    <span
      ref={ref}
      className="block absolute inset-0 -z-10 overflow-hidden bg-gray-400 dark:bg-gray-700 w-full h-full"
    >
      {inView && <Sparkles />}
    </span>
  );
};

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
    <span className={clsx("block w-full h-full relative isolate", isSkeleton && "cursor-wait")}>
      <Image
        id={id}
        {...props}
        alt={props.alt}
        onLoad={onLoad}
        onError={onError}
        style={style}
        fetchPriority={fetchPriority}
      />

      {isSkeleton && <ImageSkeleton />}
    </span>
  );
};
