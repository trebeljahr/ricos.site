import { type HTMLAttributes, type RefObject, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./LogicBuilder.module.css";

type Props = HTMLAttributes<HTMLDivElement> & {
  x: number;
  y: number;
  menuRef?: RefObject<HTMLDivElement | null>;
};

/** Keep menus outside transformed circuit canvases and inside the visible viewport. */
export function ViewportContextMenu({ x, y, menuRef, children, ...props }: Props) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = menuRef ?? localRef;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const viewport = window.visualViewport;
    const position = () => {
      const left = (viewport?.offsetLeft ?? 0) + 8;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const width = Math.max(0, (viewport?.width ?? window.innerWidth) - 16);
      const height = Math.max(0, (viewport?.height ?? window.innerHeight) - 16);
      element.style.maxWidth = `${width}px`;
      element.style.maxHeight = `${height}px`;
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.max(left, Math.min(x, left + width - rect.width))}px`;
      element.style.top = `${Math.max(top, Math.min(y, top + height - rect.height))}px`;
    };
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    observer?.observe(element);
    window.addEventListener("resize", position);
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
    };
  }, [x, y, ref]);
  return createPortal(
    <div {...props} ref={ref} className={styles.contextMenu} role="menu"
      style={{ position: "fixed", minWidth: 0, overflowY: "auto", overflowWrap: "anywhere", left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}>{children}</div>,
    document.body,
  );
}
