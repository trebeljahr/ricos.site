import { InfiniteScrollGallery } from "@components/Galleries";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { type ReactNode, useMemo } from "react";
import type { ImageProps } from "src/@types";
import { imageSizes, nextImageUrl } from "src/lib/mapToImageProps";

type Props = {
  /** Breadcrumb path, e.g. "photography/alps". */
  path: string;
  /** Page heading. A node rather than a string so a page can hang a control
   *  off the title — the colour pages put their swatch and picker there. */
  title: ReactNode;
  images: ImageProps[];
};

/** Page body shared by every full image gallery: photography albums and Midjourney. */
export function GalleryPage({ path, title, images }: Props) {
  // Memoized: the largest gallery was 572 images x 16 sizes = 9,152 objects,
  // which was rebuilt on every render. `images` is a stable prop from
  // getStaticProps, so this only runs when navigating to another gallery.
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
        <InfiniteScrollGallery images={imagesWithSrcSet} />
        <ToTopButton />
      </section>
    </PageMain>
  );
}
