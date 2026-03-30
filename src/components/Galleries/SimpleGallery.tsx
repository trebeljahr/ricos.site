import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useMemo } from "react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import { ImageProps } from "src/@types";
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
        sizes={{
          size: "calc(100vw - 24px)",
          sizes: [
            { viewport: "(max-width: 768px)", size: "calc(100vw - 24px)" },
            { viewport: "(max-width: 1200px)", size: "calc(65ch)" },
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
