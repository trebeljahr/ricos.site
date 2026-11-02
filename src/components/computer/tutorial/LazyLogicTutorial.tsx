import dynamic from "next/dynamic";
import { LazyMount } from "../LazyMount";
import { loadCircuitDemos } from "../loadCircuitDemos";
import type { LogicTutorialProps } from "./LogicTutorial";
import styles from "./Tutorial.module.css";

// One chunk for every builder on the page: the first one to ask loads it, the
// others reuse it.
const LogicTutorial = dynamic(() => loadCircuitDemos().then((module) => module.LogicTutorial), {
  ssr: false,
  loading: () => null,
});

/**
 * A tutorial builder that mounts only once it comes near the screen, with a
 * light placeholder of the same height until then. Several can share a page.
 */
export function LazyLogicTutorial({
  height = "min(85svh, 820px)",
  title = "Circuit builder",
  embedded = true,
  ...props
}: LogicTutorialProps & { height?: string; title?: string }) {
  return (
    <LazyMount
      height={embedded ? "auto" : height}
      label={title}
      preload={loadCircuitDemos}
      placeholder={
        <div className={styles.placeholder} style={{ minHeight: height }}>
          {title}: loading…
        </div>
      }
    >
      <LogicTutorial {...props} embedded={embedded} />
    </LazyMount>
  );
}
