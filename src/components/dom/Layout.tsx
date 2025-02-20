import { PropsWithChildren, ReactNode } from "react";
import { NavbarWithLinks } from "./Navbar";

type Props = {
  extraLinks?: ReactNode;
};

export const ThreeFiberLayout = ({
  children,
  extraLinks = null,
}: PropsWithChildren<Props>) => {
  return (
    <>
      <NavbarWithLinks>{extraLinks}</NavbarWithLinks>
      <div className="w-screen h-screen">{children}</div>
    </>
  );
};
