/* eslint-disable no-unused-vars */
export interface ImageProps {
  index: number;
  tripName: string;
  name: string;
  url: string;
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
