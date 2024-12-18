/* eslint-disable no-unused-vars */
export interface ImageProps {
  index: number;
  width: number;
  id: string;
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
