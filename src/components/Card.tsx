import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import { getMDXComponent } from "mdx-bundler/client";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
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

// "tall" crops photos into a fixed-height banner. "video" keeps the whole
// image at 16:9, which suits screenshots (e.g. the /projects cards).
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
  const hasDimensions = cover.width !== undefined && cover.height !== undefined;

  return (
    <Link
      href={link}
      prefetch={prefetch}
      className={clsx(
        "group not-prose relative w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white text-gray-900 no-underline shadow-sm",
        // The card moves as one piece: a separate cover zoom on its own timing
        // made the image drift against the frame. transform-gpu keeps the cover
        // from re-rasterising (and visibly snapping) when the lift settles.
        "transform-gpu transition duration-300 ease-out hover:-translate-y-1",
        // Hover glow: an even, all-sides blue shadow so the border itself looks lit.
        "hover:border-myBlue/70 hover:shadow-[0_0_24px_-2px] hover:shadow-myBlue/40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myBlue",
        "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-myBlue/80 dark:hover:shadow-myBlue/50",
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
            : coverAspect === "video"
              ? "aspect-video"
              : "h-64",
        )}
      >
        {/* Absolutely positioned so the cover never sets the card's height: in
            the horizontal layout a tall book cover used to stretch the row and
            leave a gap under the text. The frame's own height rules instead. */}
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
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className={clsx("flex min-w-0 grow flex-col", compact ? "px-3 py-2.5" : "p-5 md:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <Heading
            className={clsx(
              "m-0 grow leading-snug tracking-tight transition-colors group-hover:text-myBlue",
              compact ? "text-base font-semibold" : "text-xl font-bold md:text-2xl",
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

        {subtitle && (
          <p className="m-0 mt-1.5 text-base font-medium text-gray-700 dark:text-gray-200">
            {subtitle}
          </p>
        )}

        {(markdownExcerpt || excerpt) && (
          // The browser draws the "…" when an excerpt overflows, so cards keep
          // a consistent height no matter how long the stored excerpt is.
          <div className="mt-3 line-clamp-4 text-[0.9375rem] leading-relaxed text-gray-600 dark:text-gray-400 [&_p]:my-0">
            {markdownExcerpt ? <MDXExcerpt source={markdownExcerpt} /> : <p>{excerpt}</p>}
          </div>
        )}

        {children}

        {hasMetadata && (
          // Pinned to the bottom so metadata lines up across a row of cards.
          <div className="mt-auto pt-1">
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
    </Link>
  );
}
