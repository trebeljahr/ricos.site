import Image from "next/image";
type AvatarProps = {
  picture: string;
};

const Avatar = ({ picture }: AvatarProps) => {
  return (
    <div className="">
      <Image
        src={picture}
        alt="Picture of the author"
        layout="fill"
        objectFit="cover"
        className="rounded-full"
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
    <div className="">
      <Avatar picture={picture} />
      <div className="">by {name}</div>
    </div>
  );
};
