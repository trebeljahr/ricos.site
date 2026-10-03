import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import styles from "./CircuitToolbar.module.css";

type Layout = "menus" | "tabs";
type Task = "build" | "view" | "simulate";
const PREFERENCE = "ricos-computer-toolbar-layout-v1";

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
  running: boolean;
};

function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.menu}>
      <summary>
        {label}
        <span aria-hidden="true" className={styles.chevron}>
          ⌄
        </span>
      </summary>
      <div className={styles.menuPanel}>{children}</div>
    </details>
  );
}

export function CircuitToolbar(props: CircuitToolbarProps) {
  const [layout, setLayout] = useState<Layout>("menus");
  const [task, setTask] = useState<Task>("build");
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const activeTask = task === "simulate" && !props.hasClock ? "build" : task;
  const tasks: { id: Task; label: string }[] = [
    { id: "build", label: "Build" },
    { id: "view", label: "View" },
    ...(props.hasClock ? [{ id: "simulate" as const, label: "Simulate" }] : []),
  ];

  useEffect(() => {
    try {
      const value =
        new URLSearchParams(window.location.search).get("toolbar") ??
        localStorage.getItem(PREFERENCE);
      if (value === "menus" || value === "tabs") setLayout(value);
    } catch {
      // The comparison still works when browser storage is unavailable.
    }
  }, []);

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

  const chooseLayout = (value: Layout) => {
    root.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
    setLayout(value);
    try {
      localStorage.setItem(PREFERENCE, value);
    } catch {
      /* Optional preference. */
    }
  };

  const fileMenu = (
    <Disclosure label="File">
      <div role="group" aria-label="Circuit files" className={styles.menuActions}>
        {props.files}
      </div>
      {layout === "menus" && (
        <>
          <div className={styles.menuDivider} />
          {props.clear}
        </>
      )}
    </Disclosure>
  );

  return (
    <section
      ref={root}
      className={styles.root}
      data-layout={layout}
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
        {layout === "menus" ? (
          <>
            <nav className={styles.menuBar} aria-label="Circuit commands">
              {fileMenu}
              <Disclosure label="View">
                <div role="group" aria-label="Circuit view" className={styles.menuActions}>
                  {props.view}
                </div>
              </Disclosure>
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
                <Disclosure label="Clock">
                  <div className={styles.clockSettings}>
                    {props.clockSettings}
                    {props.clockStatus}
                  </div>
                </Disclosure>
              </div>
            )}
          </>
        ) : (
          <>
            {fileMenu}
            {props.running && activeTask !== "simulate" && (
              <div className={styles.playback} role="group" aria-label="Simulation">
                {props.playback}
              </div>
            )}
          </>
        )}
        <div className={styles.headerEnd}>
          {props.save}
          <label className={styles.layoutChoice}>
            <span>Toolbar</span>
            <select
              aria-label="Toolbar layout"
              value={layout}
              onChange={(event) => chooseLayout(event.target.value as Layout)}
            >
              <option value="menus">A · Compact menus</option>
              <option value="tabs">B · Task tabs</option>
            </select>
          </label>
        </div>
      </div>
      {layout === "tabs" && (
        <div className={styles.taskRow}>
          <div role="tablist" aria-label="Circuit tasks" className={styles.tabs}>
            {tasks.map((item, index) => (
              <button
                key={item.id}
                id={`${id}-${item.id}`}
                type="button"
                role="tab"
                aria-selected={activeTask === item.id}
                aria-controls={`${id}-panel`}
                tabIndex={activeTask === item.id ? 0 : -1}
                onClick={() => setTask(item.id)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tasks.length
                      : event.key === "ArrowLeft"
                        ? (index + tasks.length - 1) % tasks.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tasks.length - 1
                            : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setTask(tasks[next].id);
                  document.getElementById(`${id}-${tasks[next].id}`)?.focus();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-${activeTask}`}
            className={styles.taskPanel}
          >
            {activeTask === "build" && (
              <>
                <div role="group" aria-label="Edit circuit" className={styles.inlineActions}>
                  {props.history}
                </div>
                <span className={styles.separator} />
                <div role="group" aria-label="Learning tools">
                  {props.learning}
                </div>
                <span className={styles.separator} />
                {props.clear}
              </>
            )}
            {activeTask === "view" && (
              <div role="group" aria-label="Circuit view" className={styles.inlineActions}>
                {props.view}
              </div>
            )}
            {activeTask === "simulate" && (
              <div role="group" aria-label="Simulation" className={styles.inlineActions}>
                {props.playback}
                <span className={styles.separator} />
                {props.clockSettings}
                {props.clockStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
