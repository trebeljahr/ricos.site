import { SpinningLoader } from "@components/SpinningLoader";
import { lazy, Suspense } from "react";

const ThreeJs = lazy(() => import("./ThreeJs"));

const _Component = () => {
  return (
    <Suspense fallback={<SpinningLoader />}>
      <ThreeJs />
    </Suspense>
  );
};

export default _Component;
