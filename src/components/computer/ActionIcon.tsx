import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArchiveIcon,
  Component1Icon,
  CounterClockwiseClockIcon,
  Cross1Icon,
  CursorArrowIcon,
  EnterFullScreenIcon,
  Link2Icon,
  LayersIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  ScissorsIcon,
  TrackNextIcon,
} from "@radix-ui/react-icons";
import type { ComponentType } from "react";
import { FaTrash } from "../Icons";

type ActionIconName =
  | "unfold" | "play" | "pause" | "step" | "reset" | "save"
  | "export" | "import" | "clear" | "undo" | "redo" | "wiring"
  | "bus" | "delete" | "rotateLeft" | "rotateRight" | "cut"
  | "selectAll" | "close";

const icons = {
  unfold: EnterFullScreenIcon,
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
  rotateLeft: CounterClockwiseClockIcon,
  rotateRight: CounterClockwiseClockIcon,
  cut: ScissorsIcon,
  selectAll: CursorArrowIcon,
  close: Cross1Icon,
} satisfies Record<ActionIconName, ComponentType<{ width?: number; height?: number }>>;

export function ActionIcon({ name }: { name: ActionIconName }) {
  const Icon = icons[name];
  return <Icon width={16} height={16} style={name === "redo" || name === "rotateRight" ? { transform: "scaleX(-1)" } : undefined} />;
}
