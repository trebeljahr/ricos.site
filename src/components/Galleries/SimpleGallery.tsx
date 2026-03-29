import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useMemo } from "react";
import { RowsPhotoAlbum } from "react-photo-album";
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
