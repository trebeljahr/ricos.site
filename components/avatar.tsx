import Image from "next/image";
type Props = {
  name: string;
  picture: string;
};

const Avatar = ({ name, picture }: Props) => {
  return (
    <div className="flex items-center ">
      <div className="h-12 w-12 relative mr-4">
        <Image
          src={picture}
          alt="Picture of the author"
          layout="fill" // required
          objectFit="cover" // change to suit your needs
          className="rounded-full" // just an example
        />
      </div>
      <div className="text-xl font-bold">{name}</div>
    </div>
  );
};

export default Avatar;
