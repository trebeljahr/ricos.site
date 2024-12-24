import Image, { ImageProps } from "next/image";

export const ImageWithLoader = ({ ...props }: ImageProps) => {
  return (
    <div className="relative w-full h-full">
      <div className="duration-200 h-full w-full relative overflow-hidden bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-zinc-950 max-w-md border bg-[length:250%_250%,100%_100%] bg-[position:-100%_0,0_0] bg-no-repeat shadow-2xl transition-[background-position_0s_ease] hover:bg-[position:200%_0,0_0] hover:duration-[1500ms]">
        <Image
          {...props}
          alt={props.alt}
          style={props.fill ? {} : { height: "auto", width: "auto" }}
        />
      </div>
    </div>
  );
};
