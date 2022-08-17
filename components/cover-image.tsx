import Image from "next/image";

type Props = {
  title: string;
  src: string;
  amazonLink?: string;
};

const CoverImageWithLink = ({ title, src, amazonLink }: Props) => {
  const alt = `Bookcover - ${title}`;

  const ImageTag = (
    <Image src={src} layout="fill" objectFit="cover" alt={alt} />
  );

  if (amazonLink) {
    return (
      <a
        className="externalLink"
        target="_blank"
        rel="noopener noreferrer"
        href={amazonLink}
      >
        {ImageTag}
        <div className="amazonLinkHoverBox">
          <span>Buy it on Amazon</span>
        </div>
      </a>
    );
  }
  return ImageTag;
};

export const PostCoverImage = ({
  src,
  title,
}: {
  src: string;
  title: string;
}) => {
  return (
    <Image
      src={src}
      layout="fill"
      objectFit="cover"
      alt={"Cover for post: " + title}
    />
  );
};

export const BookCover = ({ title, src, amazonLink }: Props) => {
  return (
    <div className="book-cover-image">
      <CoverImageWithLink title={title} src={src} amazonLink={amazonLink} />
    </div>
  );
};
