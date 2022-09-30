import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const PostTitle = ({ children }: Props) => {
  return children ? <h1>{children}</h1> : null;
};

export const PostSubTitle = ({ children }: Props) => {
  return children ? <h2>{children}</h2> : null;
};
