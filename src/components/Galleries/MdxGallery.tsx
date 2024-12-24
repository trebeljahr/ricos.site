import { SimpleGallery } from "@components/Galleries";
import { useEffect, useState } from "react";
import { ImageProps } from "src/@types";
import { getImgWidthAndHeight } from "src/lib/mapToImageProps";

const ImageGallery = (props: { imageSources: string[] }) => {
  const { imageSources } = props;

  const [photos, setPhotos] = useState<ImageProps[] | null>(null);

  useEffect(() => {
    async function loadImages() {
      const loadedPhotos = await Promise.all(
        imageSources.map(async (src, index) => {
          const { width, height } = await getImgWidthAndHeight(src);

          return {
            src,
            width,
            height,
          };
        })
      );
      setPhotos(loadedPhotos);
    }

    loadImages();
  }, [imageSources]);

  if (!photos) return null;

  return <SimpleGallery photos={photos} />;
};

export default ImageGallery;
