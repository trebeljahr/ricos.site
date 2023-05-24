/* eslint-disable no-unused-vars */
export interface ImageProps {
  index: number;
  tripName: string;
  width: number;
  height: number;
  name: string;
  src: string;
  blurDataURL?: string;
  srcSet: {
    src: string;
    width: number;
    height: number;
  }[];
}

export interface SharedModalProps {
  index: number;
  images: ImageProps[];
  currentPhoto?: ImageProps;
  changePhotoId: (newVal: number) => void;
  closeModal: () => void;
  navigation: boolean;
  direction?: number;
}
