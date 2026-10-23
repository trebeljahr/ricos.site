import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  enabled: boolean;
  onLoad: (id: string) => void;
};

const RETRY_DELAYS = [1000, 3000, 8000];

/** Keeps nearby downloads alive while scrolling and recovers transient failures. */
export const SpectrumThumbnail = ({ id, src, srcSet, sizes, width, enabled, onLoad }: Props) => {
  const [started, setStarted] = useState(enabled);
  const [attempt, setAttempt] = useState(0);
  const [broken, setBroken] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const retries = useRef(0);
  const shouldLoad = enabled || started;

  // Defer new tiles during a fast pass, but don't discard an in-flight image
  // still in the rendered rows. On a slow connection it may never finish if
  // each scroll burst replaces its element.
  useEffect(() => {
    if (enabled) setStarted(true);
  }, [enabled]);

  const handleLoad = useCallback(() => {
    setBroken(false);
    onLoad(id);
  }, [id, onLoad]);

  // The server's image may finish before hydration attaches event handlers.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt replaces the DOM node, so each retry needs its own completion check.
  useEffect(() => {
    const image = imageRef.current;
    if (!shouldLoad || !image?.complete) return;
    if (image.naturalWidth > 0) handleLoad();
    else setBroken(true);
  }, [shouldLoad, attempt, handleLoad]);

  useEffect(() => {
    if (!broken) return;
    const retry = () => {
      setBroken(false);
      setAttempt((value) => value + 1);
    };
    // Retry only actual failures; a slow download gets as long as it needs.
    // Remounting retries the same URL without adding cache-busting queries.
    const delay = RETRY_DELAYS[retries.current];
    const timer =
      delay === undefined
        ? undefined
        : setTimeout(() => {
            retries.current++;
            retry();
          }, delay);
    const onOnline = () => {
      retries.current = 0;
      retry();
    };
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [broken]);

  if (!shouldLoad) return null;

  return (
    // biome-ignore lint/performance/noImgElement: spectrum URLs already use the image pipeline; only nearby virtualized rows mount these thumbnails.
    <img
      key={attempt}
      ref={imageRef}
      src={src}
      // After a failure, use the small fallback alone so the browser cannot
      // keep selecting the failed (and more expensive) responsive candidate.
      srcSet={attempt === 0 ? srcSet : undefined}
      sizes={sizes}
      alt=""
      aria-hidden="true"
      width={width}
      height={180}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={() => setBroken(true)}
      data-broken={broken ? "" : undefined}
      className="h-full w-full object-cover data-broken:invisible"
    />
  );
};
