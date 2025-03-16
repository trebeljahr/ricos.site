import { PropsWithChildren, ReactNode } from "react";
import { NavbarWithLinks } from "./Navbar";
import { nav } from "@r3f/ChunkGenerationSystem/config";

type Props = {
  extraLinks?: ReactNode;
};

export const ThreeFiberLayout = ({
  children,
  extraLinks = null,
}: PropsWithChildren<Props>) => {
  return (
    <>
      {nav && <NavbarWithLinks>{extraLinks}</NavbarWithLinks>}
      <div className="w-screen h-screen">{children}</div>
    </>
  );
};
