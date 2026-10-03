import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArchiveIcon,
  Component1Icon,
  CounterClockwiseClockIcon,
  Cross1Icon,
  CursorArrowIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  Link2Icon,
  LoopIcon,
  LayersIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  ScissorsIcon,
  TrackNextIcon,
} from "@radix-ui/react-icons";
import type { ComponentType } from "react";
import { FaTrash } from "../Icons";

function RotateArrowIcon({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.2 5.8a5.5 5.5 0 1 1-.5 3.4M3.2 5.8H.9m2.3 0V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ActionIconName =
  | "unfold" | "fold" | "play" | "pause" | "step" | "reset" | "save"
  | "export" | "import" | "clear" | "undo" | "redo" | "wiring"
  | "bus" | "delete" | "rotateLeft" | "rotateRight" | "cut"
  | "selectAll" | "close";

const icons = {
  unfold: LoopIcon,
  fold: ExitFullScreenIcon,
  play: PlayIcon,
  pause: PauseIcon,
  step: TrackNextIcon,
  reset: ResetIcon,
  save: ArchiveIcon,
  export: ArrowUpIcon,
  import: ArrowDownIcon,
  clear: FaTrash,
  undo: CounterClockwiseClockIcon,
  redo: CounterClockwiseClockIcon,
  wiring: Link2Icon,
  bus: LayersIcon,
  delete: FaTrash,
  rotateLeft: RotateArrowIcon,
  rotateRight: RotateArrowIcon,
  cut: ScissorsIcon,
  selectAll: CursorArrowIcon,
  close: Cross1Icon,
} satisfies Record<ActionIconName, ComponentType<{ width?: number; height?: number }>>;

export function ActionIcon({ name }: { name: ActionIconName }) {
  const Icon = icons[name];
  return <Icon width={16} height={16} style={name === "redo" || name === "rotateRight" ? { transform: "scaleX(-1)" } : undefined} />;
}
