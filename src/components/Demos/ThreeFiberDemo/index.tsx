import { SpinningLoader } from "@components/SpinningLoader";
import dynamic from "next/dynamic";

export const ThreeFiberDemo = dynamic(import("./_Component"), {
  ssr: false,
  loading: () => <SpinningLoader />,
});
