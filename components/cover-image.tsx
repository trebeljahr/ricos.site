import Image from "next/image";

type Props = {
  title: string;
  src: string;
};

export const PostCoverImage = ({ src, title }: Props) => {
  return (
    <Image
      src={src}
      layout="fill"
      objectFit="cover"
      alt={"Cover for post: " + title}
    />
  );
};

export const BookCover = ({ title, src }: Props) => {
  return (
    <div className="book-cover-image">
      <Image
        src={src}
        layout="fill"
        objectFit="cover"
        alt={`Bookcover - ${title}`}
      />
    </div>
  );
};
