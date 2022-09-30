import Image from "next/image";

type Props = {
  title: string;
  src: string;
  priority?: boolean;
};

export const PostCoverImage = ({ src, title, priority = false }: Props) => {
  return (
    <Image
      src={src}
      layout="fill"
      objectFit="cover"
      alt={"Cover for post: " + title}
      // placeholder="blur"
      priority={priority}
    />
  );
};

export const BookCover = ({ title, src }: Props) => {
  return (
    <span className="book-cover-image">
      <Image
        src={src}
        layout="fill"
        objectFit="cover"
        alt={`Bookcover - ${title}`}
        // placeholder="blur"
      />
    </span>
  );
};
