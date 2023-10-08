import Image from "next/image";
import { nextImageUrl } from "src/lib/mapToImageProps";

type AvatarProps = {
  picture: string;
};

const Avatar = ({ picture }: AvatarProps) => {
  return (
    <div className="avatar-container">
      <Image
        src={picture}
        alt="Picture of the author"
        placeholder="blur"
        blurDataURL={nextImageUrl(picture, 16, 1)}
        className="round"
        fill
        sizes="100vw"
        style={{
          objectFit: "cover",
        }}
      />
    </div>
  );
};

type Props = {
  name: string;
  picture: string;
};

export const AvatarWithAuthor = ({ name, picture }: Props) => {
  return (
    <div className="avatar-with-author">
      <Avatar picture={picture} />
      <div style={{ marginLeft: "10px" }}>by {name}</div>
    </div>
  );
};
