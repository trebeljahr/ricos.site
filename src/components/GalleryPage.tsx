import { InfiniteScrollGallery } from "@components/Galleries";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { type ReactNode, useMemo } from "react";
import type { ImageProps } from "src/@types";
import { imageSizes, nextImageUrl } from "src/lib/mapToImageProps";

type Props = {
  /** Breadcrumb path, e.g. "photography/alps". */
  path: string;
  title: string;
  images: ImageProps[];
  /** Block rendered between the page heading and the grid.
   *
   *  The colour pages need one — a swatch, how many photos the family holds,
   *  the wheel with this family pulled out, the trips the colour comes from —
   *  and it has to sit after the breadcrumbs and the h1, which this component
   *  owns. Rendering it in the page above `GalleryPage` would put it above the
   *  breadcrumbs instead and break the header rhythm every other page keeps,
   *  so the slot lives here. Optional: the trip and Midjourney galleries pass
   *  nothing and render exactly as before. */
  intro?: ReactNode;
};

/** Page body shared by every full image gallery: photography albums and Midjourney. */
export function GalleryPage({ path, title, images, intro }: Props) {
  // Memoized: the largest gallery was 572 images x 16 sizes = 9,152 objects,
  // which was rebuilt on every render. `images` is a stable prop from
  // getStaticProps, so this only runs when navigating to another gallery.
  // The colour family pages are now the biggest callers at 600 images (9,600
  // objects); they cap there deliberately, see PAGE_LIMIT in
  // src/pages/photography/colors/[family].tsx.
  const imagesWithSrcSet = useMemo(
    () =>
      images.map((image) => {
        // Math.round() collapsed the aspect ratio to an integer (a 3:2
        // landscape photo became 1), so every srcSet entry carried a wrong
        // height and react-photo-album reserved the wrong box.
        const aspectRatio = image.height / image.width;
        return {
          ...image,
          srcSet: imageSizes.map((size) => ({
            src: nextImageUrl(image.src, size),
            width: size,
            height: Math.round(aspectRatio * size),
          })),
        };
      }),
    [images],
  );

  return (
    <PageMain>
      <section>
        <Header breadcrumbs={{ path }} title={title} />
        {intro}
        <InfiniteScrollGallery images={imagesWithSrcSet} />
        <ToTopButton />
      </section>
    </PageMain>
  );
}
