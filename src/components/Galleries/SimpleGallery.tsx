import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useMemo } from "react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import type { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils/misc";
import { CustomLightBox, useCustomLightbox } from "./useCustomLightbox";

const SimpleGallery = ({ photos: images }: { photos: ImageProps[] }) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);
  const props = useCustomLightbox({ photos });
  const { openModal } = props;

  return (
    <>
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={400}
        render={{ image: CustomImageRenderer as any }}
        defaultContainerWidth={1200}
        // Inline galleries render inside the `max-w-prose` column, not the
        // viewport: 100vw - 24px below 768px, 651px to 1279px, 723px above.
        // The old `calc(100vw - 24px)` default over-declared by ~2x and pulled
        // 1920/3840 variants into ~350px slots.
        sizes={{
          size: "723px",
          sizes: [
            { viewport: "(max-width: 768px)", size: "calc(100vw - 24px)" },
            { viewport: "(max-width: 1279px)", size: "651px" },
          ],
        }}
        onClick={({ photo }: any) => {
          openModal({
            ...photo,
          });
        }}
      />
      <CustomLightBox {...props} photos={photos} />
    </>
  );
};

export default SimpleGallery;
