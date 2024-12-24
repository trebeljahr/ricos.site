import { NextJsImage } from "@components/images/CustomRenderers";
import { useMemo } from "react";
import { PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils";
import { CustomLightBox, useCustomLightbox } from "./useCustomLightbox";

const SimpleGallery = ({ photos: images }: { photos: ImageProps[] }) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);
  const props = useCustomLightbox({ photos });
  const { openModal } = props;

  return (
    <>
      <PhotoAlbum
        photos={photos}
        targetRowHeight={400}
        layout="rows"
        renderPhoto={NextJsImage}
        defaultContainerWidth={1200}
        onClick={(photo) => {
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
