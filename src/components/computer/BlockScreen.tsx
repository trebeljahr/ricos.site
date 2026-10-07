import { DATAPATH_BLOCKS, isDatapathKind, screenView } from "../../lib/computer/datapathBlocks";
import { ScreenGrid } from "./ScreenGrid";

/** A folded screen block's grid: a framebuffer's rows, or a monitor's phosphor and beam. */
export function BlockScreen({
  behaviour,
  state,
  label,
}: {
  behaviour: string | undefined;
  state: unknown;
  label?: string;
}) {
  const { rows, beam, size } = screenView(behaviour, state);
  return (
    <ScreenGrid
      rows={rows}
      size={size}
      beam={behaviour?.startsWith("crt") ? beam : undefined}
      label={label || (isDatapathKind(behaviour) ? DATAPATH_BLOCKS[behaviour].label : "SCREEN")}
    />
  );
}
