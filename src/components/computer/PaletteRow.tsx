import type { CSSProperties, DragEvent, ReactNode } from "react";
import type { PaletteRow, Placement } from "../../lib/computer/tutorial/paletteRows";
import { GateSymbol } from "./GateSymbol";
import builderStyles from "./LogicBuilder.module.css";
import styles from "./PaletteRow.module.css";

/** Drag payload type for palette rows: the row key and which version. */
export const ROW_DRAG_TYPE = "application/x-logic-row";

/**
 * One entry of the parts list. A tutorial part shows the version the reader's
 * setting picks, a "yours" mark when that is the reader's own circuit, and a
 * chip that places the other version.
 */
export function PaletteRowView({
  row,
  accent,
  onPlace,
  children,
}: {
  row: PaletteRow;
  accent: string;
  onPlace: (placement: Placement) => void;
  /** Extra buttons at the end of the row, e.g. "view diagram". */
  children?: ReactNode;
}) {
  const drag = (which: "primary" | "secondary") => (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData(ROW_DRAG_TYPE, `${which}:${row.key}`);
    event.dataTransfer.effectAllowed = "copy";
  };
  const icon = (
    <span className={builderStyles.partIcon}>
      {"type" in row.icon ? (
        <GateSymbol type={row.icon.type} />
      ) : (
        <GateSymbol type="module" circuitName={row.icon.circuitName} />
      )}
    </span>
  );
  const style = { "--part-accent": accent } as CSSProperties;
  return (
    <div className={builderStyles.savedPart} data-palette-part={row.key}>
      {row.primary ? (
        <button
          type="button"
          draggable
          onDragStart={drag("primary")}
          onClick={() => onPlace(row.primary!)}
          title={row.title}
          style={style}
        >
          {icon}
          <span>{row.label}</span>
          {row.ownPrimary && (
            <span className={styles.mine} aria-hidden="true" title="Your own, checked circuit">
              ✓
            </span>
          )}
        </button>
      ) : (
        <span className={styles.lockedEntry} title={row.title} style={style}>
          {icon}
          <span>{row.label}</span>
        </span>
      )}
      {row.secondary && (
        <button
          type="button"
          className={styles.chip}
          draggable
          onDragStart={drag("secondary")}
          onClick={() => onPlace(row.secondary!.placement)}
          title={row.secondary.title}
          aria-label={`Add ${row.secondary.text === "yours" ? "your" : "the built-in"} ${row.label}`}
          data-own={row.secondary.text === "yours" || undefined}
        >
          {row.secondary.text === "yours" ? "✓ yours" : row.secondary.text}
        </button>
      )}
      {row.locked && (
        <a className={styles.build} href={row.locked.href} title={row.title}>
          {row.locked.text} →
        </a>
      )}
      {children}
    </div>
  );
}
