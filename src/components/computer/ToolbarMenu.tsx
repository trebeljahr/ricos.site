import type { ReactNode } from "react";
import styles from "./CircuitToolbar.module.css";

type ToolbarMenuProps = {
  label: string;
  children: ReactNode;
  panelClassName?: string;
};

export function ToolbarMenu({
  label,
  children,
  panelClassName = styles.menuPanel,
}: ToolbarMenuProps) {
  return (
    <details className={styles.menu}>
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
