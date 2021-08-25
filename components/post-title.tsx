import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const PostTitle = ({ children }: Props) => {
  return (
    <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-none md:leading-tight mb-6">
      {children}
    </h1>
  );
};

export const PostSubTitle = ({ children }: Props) => {
  return (
    <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tighter leading-none md:leading-tight mb-6 md:mb-12">
      {children}
    </h2>
  );
};
