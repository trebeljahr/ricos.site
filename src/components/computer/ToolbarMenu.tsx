import { type ReactNode, useEffect, useRef } from "react";
import styles from "./CircuitToolbar.module.css";

type ToolbarMenuProps = {
  label: string;
  children: ReactNode;
  panelClassName?: string;
  closeOnSelect?: boolean;
};

export function ToolbarMenu({
  label,
  children,
  panelClassName = styles.menuPanel,
  closeOnSelect = false,
}: ToolbarMenuProps) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!closeOnSelect) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && !menu.current?.contains(event.target) && menu.current)
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [closeOnSelect]);
  const close = () => {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  };
  return (
    <details
      ref={menu}
      className={styles.menu}
      onKeyDown={(event) => {
        if (closeOnSelect && event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
      onClick={(event) => {
        if (closeOnSelect && event.target instanceof Element && event.target.closest("button"))
          close();
      }}
    >
      <summary>
        {label}
        <svg aria-hidden="true" viewBox="0 0 12 12">
          <path d="m2 4 4 4 4-4" />
        </svg>
      </summary>
      <div className={panelClassName}>{children}</div>
    </details>
  );
}
