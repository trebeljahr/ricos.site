import { SpinningLoader } from "@components/SpinningLoader";
import dynamic from "next/dynamic";

export const ThreeFiberDemo = dynamic(import("./ThreeFiberDemo"), {
  ssr: false,
  loading: () => <SpinningLoader />,
});
