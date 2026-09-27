import { type FC, type ReactNode, useEffect, useRef } from "react";

type Entry = {
  link: HTMLAnchorElement;
  item: HTMLElement;
  heading: HTMLElement;
};

/**
 * The table of contents remark-toc generates, with the section currently under
 * the navbar marked. An IntersectionObserver on the headings does the watching,
 * so there is no scroll listener here either — the bar in the gutter and the
 * reading progress bar are the same idea in two places.
 */
export const TableOfContents: FC<{ children?: ReactNode }> = ({ children }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // remark-resolve-redirects rewrites the bare `#anchor` remark-toc emits into
    // a full `/posts/slug#anchor`, so the hash is what identifies an entry here,
    // not the start of the href.
    const entries = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((link): Entry | null => {
        const id = decodeURIComponent(link.hash.slice(1));
        const heading = id ? document.getElementById(id) : null;
        const item = link.closest("li");
        return heading && item ? { link, item, heading } : null;
      })
      .filter((entry): entry is Entry => entry !== null);

    if (entries.length === 0) return;

    // Headings carry a scroll-margin-top so the navbar never covers them after
    // a jump. Measuring against that same line moves the highlight when the
    // heading settles under the navbar, not when it touches the viewport edge.
    const offsetOf = (heading: HTMLElement) =>
      Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;

    let active: Entry | undefined;

    const update = () => {
      // The observer only reports that some heading crossed the line; which
      // section owns the screen is whichever heading sits last above it. Rects
      // are read here rather than cached, so the answer survives images
      // loading and the column reflowing. Nothing above the line means nothing
      // has been read yet, and the marker stays away.
      let current: Entry | undefined;
      for (const entry of entries) {
        if (entry.heading.getBoundingClientRect().top - offsetOf(entry.heading) <= 1) {
          current = entry;
        }
      }

      if (current === active) return;
      active?.link.removeAttribute("aria-current");
      active = current;

      if (!current) {
        delete root.dataset.spy;
        return;
      }

      current.link.setAttribute("aria-current", "location");
      root.style.setProperty("--toc-active-top", `${current.item.offsetTop}px`);
      root.style.setProperty("--toc-active-height", `${current.item.offsetHeight}px`);
      root.dataset.spy = "on";
    };

    let observer: IntersectionObserver | undefined;

    // The watched region is everything above the line, so a heading's
    // intersection state is exactly "already read" and every change to it
    // fires. A band inside the viewport would miss the instant jumps a click
    // on one of these links produces: the headings it skips go from below the
    // fold to above it without ever intersecting, and the observer stays quiet.
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(update, {
        rootMargin: `100000px 0px ${offsetOf(entries[0].heading) - window.innerHeight}px 0px`,
      });
      for (const { heading } of entries) observer.observe(heading);
    };

    observe();
    window.addEventListener("resize", observe, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", observe);
      active?.link.removeAttribute("aria-current");
    };
  }, []);

  return (
    <div className="toc-spy" ref={rootRef}>
      <span className="toc-spy-marker" aria-hidden="true" />
      <ul>{children}</ul>
    </div>
  );
};
