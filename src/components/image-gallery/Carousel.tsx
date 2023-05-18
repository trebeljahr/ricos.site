import Image from "next/image";
import { useRouter } from "next/router";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../../utils/types";
import { useLastViewedPhoto } from "../../utils/useLastViewedPhoto";
import SharedModal from "./SharedModal";

export default function Carousel({
  index,
  images,
  currentPhoto,
}: {
  index: number;
  images: ImageProps[];
  currentPhoto: ImageProps;
}) {
  const router = useRouter();
  const [, setLastViewedPhoto] = useLastViewedPhoto();

  function closeModal() {
    setLastViewedPhoto(currentPhoto.index);
    router.push(`/photography/${currentPhoto.tripName}`, undefined, {
      shallow: true,
    });
  }

  function changePhotoId(newVal: number) {
    router.push(`/photography/${currentPhoto.tripName}/${newVal}`, undefined, {
      shallow: true,
    });
    return newVal;
  }

  useKeypress("Escape", () => {
    closeModal();
  });

  console.log(index, currentPhoto);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <button
        className="absolute inset-0 z-30 cursor-default bg-black backdrop-blur-2xl"
        onClick={closeModal}
      />
      <SharedModal
        index={index}
        images={images}
        changePhotoId={changePhotoId}
        currentPhoto={currentPhoto}
        closeModal={closeModal}
        navigation={true}
      />
    </div>
  );
}
