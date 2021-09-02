import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const PostTitle = ({ children }: Props) => {
  return <h1>{children}</h1>;
};

export const PostSubTitle = ({ children }: Props) => {
  return <h2>{children}</h2>;
};
