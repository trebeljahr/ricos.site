import dynamic from "next/dynamic";

export const ThreeFiberDemo = dynamic(import("./_Component"), {
  ssr: false,
});
