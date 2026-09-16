import { InfiniteScrollGallery } from "@components/Galleries";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { useMemo } from "react";
import type { ImageProps } from "src/@types";
import { imageSizes, nextImageUrl } from "src/lib/mapToImageProps";

type Props = {
  /** Breadcrumb path, e.g. "photography/alps". */
  path: string;
  title: string;
  images: ImageProps[];
};

/** Page body shared by every full image gallery: photography albums and Midjourney. */
export function GalleryPage({ path, title, images }: Props) {
  // Memoized: the largest gallery is 572 images x 16 sizes = 9,152 objects,
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
    <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
      <section>
        <Header breadcrumbs={{ path }} title={title} />
        <InfiniteScrollGallery images={imagesWithSrcSet} />
        <ToTopButton />
      </section>
    </main>
  );
}
