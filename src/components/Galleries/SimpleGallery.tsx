import { NextJsImage } from "@components/images/CustomRenderers";
import { useMemo } from "react";
import { PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils";
import { useCustomLightbox } from "./useCustomLightbox";

const SimpleGallery = ({ photos: images }: { photos: ImageProps[] }) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);
  const { LightBox, openModal } = useCustomLightbox({ photos });

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
      <LightBox />
    </>
  );
};

export default SimpleGallery;
