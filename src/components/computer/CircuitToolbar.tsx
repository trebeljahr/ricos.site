import { type ReactNode, useEffect, useRef } from "react";
import styles from "./CircuitToolbar.module.css";
import { ToolbarMenu } from "./ToolbarMenu";

type CircuitToolbarProps = {
  identity: ReactNode;
  view: ReactNode;
  files: ReactNode;
  save: ReactNode;
  learning: ReactNode;
  history: ReactNode;
  clear: ReactNode;
  playback: ReactNode;
  clockSettings: ReactNode;
  clockStatus: ReactNode;
  hasClock: boolean;
};

export function CircuitToolbar(props: CircuitToolbarProps) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      root.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
        if (!menu.contains(target)) menu.open = false;
      });
    };
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  return (
    <section
      ref={root}
      className={styles.root}
      aria-label="Circuit toolbar"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const menu = root.current?.querySelector<HTMLDetailsElement>("details[open]");
        if (!menu) return;
        event.stopPropagation();
        menu.open = false;
        menu.querySelector<HTMLElement>("summary")?.focus();
      }}
      onClick={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const action = target.closest("button");
        const menu = action?.closest("details");
        if (menu && !action?.hasAttribute("aria-pressed")) menu.open = false;
      }}
    >
      <div className={styles.headerRow}>
        <div className={styles.identitySlot}>{props.identity}</div>
        <nav className={styles.menuBar} aria-label="Circuit commands">
          <ToolbarMenu label="File">
            <div role="group" aria-label="Circuit files" className={styles.menuActions}>
              {props.files}
            </div>
            <div className={styles.menuDivider} />
            {props.clear}
          </ToolbarMenu>
          <ToolbarMenu label="View">
            <div role="group" aria-label="Circuit view" className={styles.menuActions}>
              {props.view}
            </div>
          </ToolbarMenu>
          <div role="group" aria-label="Learning tools">
            {props.learning}
          </div>
        </nav>
        <div className={styles.history} role="group" aria-label="Edit circuit">
          {props.history}
        </div>
        {props.hasClock && (
          <div className={styles.playback} role="group" aria-label="Simulation">
            {props.playback}
            <ToolbarMenu label="Clock">
              <div className={styles.clockSettings}>
                {props.clockSettings}
                {props.clockStatus}
              </div>
            </ToolbarMenu>
          </div>
        )}
        <div className={styles.headerEnd}>{props.save}</div>
      </div>
    </section>
  );
}
