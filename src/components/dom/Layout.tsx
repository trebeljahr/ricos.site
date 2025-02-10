import { Navbar } from "./Navbar";

export const ThreeFiberLayout = ({ children }: any) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};
