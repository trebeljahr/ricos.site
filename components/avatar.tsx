import Image from "next/image";
type AvatarProps = {
  picture: string;
};

const Avatar = ({ picture }: AvatarProps) => {
  return (
    <div className="h-12 w-12 relative mr-4">
      <Image
        src={picture}
        alt="Picture of the author"
        layout="fill" // required
        objectFit="cover" // change to suit your needs
        className="rounded-full" // just an example
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
    <div className="flex items-center ">
      <Avatar picture={picture} />
      <div className="text-xl font-bold">by {name}</div>
    </div>
  );
};
