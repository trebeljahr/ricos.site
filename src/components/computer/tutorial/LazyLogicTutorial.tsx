import dynamic from "next/dynamic";
import { LazyMount } from "../LazyMount";
import type { LogicTutorialProps } from "./LogicTutorial";
import styles from "./Tutorial.module.css";

// One chunk for every builder on the page: the first one to scroll near loads
// it, the others reuse it.
const LogicTutorial = dynamic(
  () => import("./LogicTutorial").then((module) => module.LogicTutorial),
  { ssr: false, loading: () => null },
);

/**
 * A tutorial builder that mounts only once it comes near the screen, with a
 * light placeholder of the same height until then. Several can share a page.
 */
export function LazyLogicTutorial({
  height = "min(85svh, 820px)",
  title = "Circuit builder",
  ...props
}: LogicTutorialProps & { height?: string; title?: string }) {
  return (
    <LazyMount
      height={height}
      label={title}
      placeholder={
        <div className={styles.placeholder} style={{ height: "100%" }}>
          {title}: loads when you scroll here.
        </div>
      }
    >
      <LogicTutorial {...props} />
    </LazyMount>
  );
}
