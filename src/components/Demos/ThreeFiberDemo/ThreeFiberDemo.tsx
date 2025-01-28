import { SpinningLoader } from "@components/SpinningLoader";
import { lazy, Suspense } from "react";

const ThreeJsBox = lazy(() => import("./ThreeJsBox"));

const _Component = () => {
  return (
    <Suspense fallback={<SpinningLoader />}>
      <ThreeJsBox />
    </Suspense>
  );
};

export default _Component;
