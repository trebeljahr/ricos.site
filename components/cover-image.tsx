import Image from "next/image";

type Props = {
  title: string;
  src: string;
  slug?: string;
};

const CoverImage = ({ title, src }: Props) => {
  const alt = `Cover Image for ${title}`;
  return <Image src={src} layout="fill" objectFit="cover" alt={alt} />;
};

export default CoverImage;
