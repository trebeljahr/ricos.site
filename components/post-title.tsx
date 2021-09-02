import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const PostTitle = ({ children }: Props) => {
  return <h1 className="">{children}</h1>;
};

export const PostSubTitle = ({ children }: Props) => {
  return <h2 className="">{children}</h2>;
};
