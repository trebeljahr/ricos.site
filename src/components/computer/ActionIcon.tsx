import type { ReactNode } from "react";

type ActionIconName =
  | "unfold"
  | "play"
  | "pause"
  | "step"
  | "reset"
  | "save"
  | "export"
  | "import"
  | "clear"
  | "undo"
  | "redo"
  | "wiring"
  | "bus"
  | "delete"
  | "rotateLeft"
  | "rotateRight"
  | "cut"
  | "selectAll"
  | "close";

export function ActionIcon({ name }: { name: ActionIconName }) {
  const paths: Record<ActionIconName, ReactNode> = {
    unfold: (
      <>
        <path d="M4 9V4h5M20 15v5h-5" />
        <path d="m4 4 6 6m10 10-6-6" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7z" />,
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    step: (
      <>
        <path d="m6 5 10 7-10 7zM19 5v14" />
      </>
    ),
    reset: (
      <>
        <path d="M4 11a8 8 0 1 1 2 6" />
        <path d="M4 4v7h7" />
      </>
    ),
    save: (
      <>
        <path d="M4 3h13l3 3v15H4zM7 3v7h10V3M7 21v-8h10v8" />
        <path d="M10 4v4h4" />
      </>
    ),
    export: <path d="M12 15V3m-4 4 4-4 4 4M4 14v6h16v-6" />,
    import: <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />,
    clear: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
      </>
    ),
    undo: (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h9a7 7 0 0 1 7 7v3" />
      </>
    ),
    redo: (
      <>
        <path d="m15 14 5-5-5-5" />
        <path d="M20 9h-9a7 7 0 0 0-7 7v3" />
      </>
    ),
    wiring: (
      <>
        <path d="M4 18h5l4-12h7" />
        <circle cx="4" cy="18" r="2" />
        <circle cx="20" cy="6" r="2" />
      </>
    ),
    bus: (
      <>
        <path d="M4 12h8V5h8M12 12v7h8" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="20" cy="5" r="2" />
        <circle cx="20" cy="19" r="2" />
      </>
    ),
    delete: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    rotateLeft: (
      <>
        <path d="M4 11a8 8 0 1 0 2-5" />
        <path d="M4 4v7h7" />
      </>
    ),
    rotateRight: (
      <>
        <path d="M20 11a8 8 0 1 1-2-5" />
        <path d="M20 4v7h-7" />
      </>
    ),
    cut: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <path d="m8 7 11 11M8 17 19 6" />
      </>
    ),
    selectAll: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <path d="M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4" />
      </>
    ),
    close: <path d="M5 5 19 19M19 5 5 19" />,
  };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
