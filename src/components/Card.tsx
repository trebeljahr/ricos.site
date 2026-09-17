import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import { getMDXComponent } from "mdx-bundler/client";
import Link from "next/link";
import { type PointerEvent, type ReactNode, useMemo, useRef } from "react";
import type { MDXResult } from "src/@types";
import { MetadataDisplay } from "./MetadataDisplay";

// The whole card is one <a>, so links inside an excerpt would nest anchors.
const excerptComponents = {
  a: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
};

const MDXExcerpt = ({ source }: { source: MDXResult }) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component components={excerptComponents} />;
};

export type CardCover = {
  src: string;
  alt: string;
  // Without intrinsic dimensions the image fills its frame instead.
  width?: number;
  height?: number;
};

export type CardLayout = "vertical" | "horizontal";

// Wide horizontal cards tilt less: the same angle swings their far edge a lot further.
const maxTilt: Record<CardLayout, number> = { vertical: 6, horizontal: 2 };

// "tall" crops photos into a fixed-height banner. "video" keeps the whole
// image at 16:9, which suits screenshots (e.g. the /projects cards); in the
// horizontal layout the frame matches every other card and the whole image
// sits inside it over a blurred copy, so mixed lists keep one card shape.
// "portrait" is for book covers: in the horizontal layout it narrows the cover
// column and keeps at least a 2:3 frame, so the whole cover stays visible.
export type CoverAspect = "tall" | "video" | "portrait";

export type CardProps = {
  link: string;
  title: string;
  cover: CardCover;
  layout?: CardLayout;
  coverAspect?: CoverAspect;
  // "compact" is for dense grids of small tiles (e.g. 3D demo previews).
  size?: "default" | "compact";
  headingAs?: "h2" | "h3";
  subtitle?: string;
  excerpt?: string;
  markdownExcerpt?: MDXResult;
  typeLabel?: string;
  date?: string;
  readingTime?: number;
  amountOfStories?: number;
  priority?: boolean;
  sizes?: string;
  prefetch?: boolean;
  className?: string;
  // Extra body content rendered below the excerpt, above the metadata.
  children?: ReactNode;
};

// `calc()` needs spaces around operators: without them the whole sizes
// attribute is a parse error and the browser fetches a 100vw variant.
const defaultSizes: Record<CardLayout, string> = {
  // The cover sits in the fixed 15rem grid column at md+.
  horizontal: "(max-width: 768px) calc(100vw - 24px), 240px",
  vertical: "(max-width: 768px) calc(100vw - 24px), (max-width: 1092px) calc(50vw - 40px), 325px",
};

export function Card({
  link,
  title,
  cover,
  layout = "vertical",
  coverAspect = "tall",
  size = "default",
  headingAs: Heading = "h2",
  subtitle,
  excerpt,
  markdownExcerpt,
  typeLabel,
  date,
  readingTime,
  amountOfStories,
  priority = false,
  sizes,
  prefetch,
  className,
  children,
}: CardProps) {
  const horizontal = layout === "horizontal";
  const compact = size === "compact";
  const hasMetadata = Boolean(date || readingTime || amountOfStories);
  const portrait = coverAspect === "portrait";
  const video = coverAspect === "video";
  const letterboxed = horizontal && video;
  const hasDimensions = cover.width !== undefined && cover.height !== undefined;
  const hasExcerpt = Boolean(markdownExcerpt || excerpt);

  // Tilt writes CSS variables straight onto the element: no React state, so a
  // pointer move never re-renders the card. One write per frame at most.
  const frame = useRef(0);
  const onPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const tilt = maxTilt[layout];
      card.style.setProperty("--rx", `${((0.5 - y) * 2 * tilt).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((x - 0.5) * 2 * tilt).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
  };
  const onPointerLeave = (event: PointerEvent<HTMLAnchorElement>) => {
    cancelAnimationFrame(frame.current);
    const { style } = event.currentTarget;
    for (const name of ["--rx", "--ry", "--gx", "--gy"]) style.removeProperty(name);
  };

  return (
    <Link
      href={link}
      prefetch={prefetch}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={clsx(
        "group not-prose relative w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white text-gray-900 no-underline shadow-sm",
        // The card moves as one piece: a separate cover zoom on its own timing
        // made the image drift against the frame. transform-gpu keeps the cover
        // from re-rasterising (and visibly snapping) when the lift settles.
        // card-tilt (globals.css) adds the pointer-driven 3D tilt and keeps the
        // translateZ(0) that transform-gpu used to provide.
        "card-tilt transition duration-300 ease-out hover:-translate-y-1",
        // Hover glow: an even, all-sides blue shadow so the border itself looks lit.
        // Border and title use the site-wide accent (globals.css), same as links.
        "hover:border-accent hover:shadow-[0_0_24px_-2px] hover:shadow-myBlue/40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myBlue",
        "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:shadow-myBlue/50",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        horizontal
          ? clsx(
              "mb-6 block md:grid",
              portrait ? "md:grid-cols-[10rem_1fr]" : "md:grid-cols-[15rem_1fr]",
            )
          : "flex flex-col self-stretch",
        className,
      )}
    >
      <div
        className={clsx(
          "relative w-full shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-700",
          horizontal
            ? clsx("h-64 md:h-auto", portrait ? "md:min-h-60" : "md:min-h-52")
            : video
              ? "aspect-video"
              : "h-64",
        )}
      >
        {/* Absolutely positioned so the cover never sets the card's height: in
            the horizontal layout a tall book cover used to stretch the row and
            leave a gap under the text. The frame's own height rules instead. */}
        {letterboxed && (
          // Same file and sizes as the cover below, so the browser fetches it once.
          <div aria-hidden="true" className="absolute inset-0 scale-125 blur-xl">
            <ImageWithLoader
              src={cover.src}
              alt=""
              aria-hidden="true"
              {...(hasDimensions ? { width: cover.width, height: cover.height } : { fill: true })}
              sizes={sizes ?? defaultSizes[layout]}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0">
          <ImageWithLoader
            src={cover.src}
            alt={cover.alt}
            {...(hasDimensions ? { width: cover.width, height: cover.height } : { fill: true })}
            sizes={
              sizes ??
              (horizontal && portrait
                ? "(max-width: 768px) calc(100vw - 24px), 160px"
                : defaultSizes[layout])
            }
            priority={priority}
            className={clsx("h-full w-full", letterboxed ? "object-contain" : "object-cover")}
          />
        </div>
      </div>

      <div className={clsx("flex min-w-0 grow flex-col", compact ? "px-3 py-2.5" : "p-5 md:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <Heading
            className={clsx(
              "m-0 grow leading-snug tracking-tight transition-colors duration-300 ease-out group-hover:text-accent",
              compact
                ? "text-base font-semibold"
                : horizontal
                  ? "text-xl font-bold md:text-2xl"
                  : // Narrow grid columns: one step smaller so long titles wrap
                    // less, and room for two lines so the text below starts at
                    // the same height across a row.
                    "min-h-[2lh] text-xl font-bold",
            )}
          >
            {title}
          </Heading>
          {typeLabel && (
            <span className="mt-1 shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs uppercase tracking-wide text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {typeLabel}
            </span>
          )}
        </div>

        {horizontal && subtitle && (
          <p className="m-0 mt-1 text-base text-gray-600 md:text-lg dark:text-gray-300">
            {subtitle}
          </p>
        )}

        {!horizontal && (subtitle || hasExcerpt) && (
          // Vertical cards sit side by side in grids, so every one shows a single
          // blurb in the same style: the subtitle when there is one (it already
          // says what the piece is about), otherwise the excerpt.
          <div className="mt-2 line-clamp-3 text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-300 [&_p]:my-0">
            {subtitle ? (
              <p>{subtitle}</p>
            ) : markdownExcerpt ? (
              <MDXExcerpt source={markdownExcerpt} />
            ) : (
              <p>{excerpt}</p>
            )}
          </div>
        )}

        {horizontal && hasExcerpt && (
          // Sized one step below body copy (prose md:prose-lg xl:prose-xl) so
          // cards don't read as fine print next to the text around them.
          // The browser draws the "…" when an excerpt overflows, so cards keep
          // a consistent height no matter how long the stored excerpt is.
          <div className="mt-3 line-clamp-4 text-base leading-relaxed text-gray-500 md:text-lg dark:text-gray-400 [&_p]:my-0">
            {markdownExcerpt ? <MDXExcerpt source={markdownExcerpt} /> : <p>{excerpt}</p>}
          </div>
        )}

        {children}

        {hasMetadata && (
          // Pinned to the bottom so metadata lines up across a row of cards.
          <div className="mt-auto pt-1 [&>div]:text-gray-500 dark:[&>div]:text-gray-400">
            <MetadataDisplay
              date={date}
              readingTime={readingTime}
              amountOfStories={amountOfStories}
              withAuthorInfo={false}
              longFormDate={false}
            />
          </div>
        )}
      </div>

      {/* Light glare that follows the pointer; above the cover and text, never
          catches clicks. */}
      <span
        aria-hidden="true"
        className="card-glare pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
      />
    </Link>
  );
}
