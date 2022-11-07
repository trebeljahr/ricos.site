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
    <div className="book-cover-image">
      <Image
        src={src}
        layout="responsive"
        width={1}
        height={1.6}
        alt={`Bookcover - ${title}`}
        // placeholder="blur"
      />
    </div>
  );
};
