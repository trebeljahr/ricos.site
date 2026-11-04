import type { ReactNode } from "react";
import styles from "./AsciiTyper.module.css";

/**
 * The bottom line of a typer's display: what it just refused, lit steadily until
 * the next key it takes, and how full it is. Sits inside a `.display`.
 */
export function DisplayStatus({
  count,
  limit,
  message,
  alert = true,
}: {
  count: number;
  limit: number;
  message?: ReactNode;
  /** False for a message that reports rather than refuses. */
  alert?: boolean;
}) {
  return (
    <div className={styles.displayStatus}>
      <p role="status" data-alert={(message && alert) || undefined}>
        {message}
      </p>
      <span>
        {count} / {limit}
      </span>
    </div>
  );
}
