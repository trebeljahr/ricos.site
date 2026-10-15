import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Renders `children` only once the box comes within `margin` of the screen,
 * and keeps them mounted after that. Until then it shows `placeholder` at the
 * same height, so the page does not jump.
 */
export function LazyMount({
  children,
  placeholder,
  height,
  margin = "600px 0px",
  label,
}: {
  children: ReactNode;
  placeholder: ReactNode;
  height: string;
  margin?: string;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = box.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, margin]);
  return (
    <section ref={box} style={{ height }} aria-label={label} data-mounted={near || undefined}>
      {near ? children : placeholder}
    </section>
  );
}
