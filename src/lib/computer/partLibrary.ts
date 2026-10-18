import {
  COUNTER_CONTRACT,
  COUNTER_MODES,
  COUNTER_WIDTHS,
  counterComponent,
  counterDemo,
  counterTitle,
} from "./counterCircuits";
import type { Circuit } from "./logic";
import {
  ADD3,
  BCD_DECODER,
  bcdSegmentDemo,
  DIGIT_COUNTS,
  decimalConverter,
  decimalSegmentDemo,
  decodedDisplayCircuit,
  rawSegmentDemo,
  SEGMENT_CONTRACT,
} from "./sevenSegment";
import { circuitRow, type PaletteRow } from "./tutorial/paletteRows";

/**
 * Configurable components as plain parts-list rows: one row per option, so
 * search, drag and click work like every other part. `open` is the row's ↗.
 */
export type LibraryItem = {
  section: LibrarySection;
  row: PaletteRow;
  open?: RowOpen;
};
/** The ↗ beside a row: what it opens, and its tooltip and accessible name. */
export type RowOpen = { title: string; label: (name: string) => string; circuit: () => Circuit };

export const LIBRARY_SECTIONS = ["Counters", "Seven-segment displays"] as const;
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number];

const COUNTER_WORDS = "counter counting increment decrement manual";
const SEGMENT_WORDS = "seven segment 7-segment display digit decimal";
const wiredDemo = (circuit: () => Circuit): RowOpen => ({
  title: "Open wired demo",
  label: (name) => `Open ${name} wired demo`,
  circuit,
});
export const diagram = (circuit: Circuit): RowOpen => ({
  title: "View diagram",
  label: (name) => `View ${name} diagram`,
  circuit: () => circuit,
});

const counters: LibraryItem[] = COUNTER_MODES.flatMap((mode) =>
  COUNTER_WIDTHS.map((width) => ({
    section: "Counters" as const,
    row: circuitRow(`counter:${width}-${mode}`, counterComponent(width, mode), {
      label: counterTitle(width, mode),
      title: COUNTER_CONTRACT,
      keywords: `${COUNTER_WORDS} ${mode === "up-down" ? "up down" : mode}`,
    }),
    open: wiredDemo(() => counterDemo(width, mode)),
  })),
);

const displays: LibraryItem[] = [
  ...DIGIT_COUNTS.map((digits): LibraryItem => {
    const label = `${digits}-digit raw display`;
    return {
      section: "Seven-segment displays",
      row: {
        key: `display:raw-${digits}`,
        label,
        icon: { type: "sevensegment" },
        title: `${SEGMENT_CONTRACT} Raw: one input per bar, 1 lights it.`,
        keywords: `${SEGMENT_WORDS} raw a-g`,
        primary: { type: "sevensegment", extra: { digits } },
        ownPrimary: false,
      },
      open: digits === 1 ? wiredDemo(rawSegmentDemo) : undefined,
    };
  }),
  ...DIGIT_COUNTS.map(
    (digits): LibraryItem => ({
      section: "Seven-segment displays",
      row: circuitRow(`display:bcd-${digits}`, decodedDisplayCircuit(digits), {
        label: `${digits}-digit BCD display`,
        title: `${SEGMENT_CONTRACT} Takes one BCD nibble per place.`,
        keywords: `${SEGMENT_WORDS} bcd decoded`,
      }),
      open: wiredDemo(() => decimalSegmentDemo(digits)),
    }),
  ),
  {
    section: "Seven-segment displays",
    row: circuitRow("display:bcd-decoder", BCD_DECODER, {
      title: SEGMENT_CONTRACT,
      keywords: `${SEGMENT_WORDS} bcd decoder`,
    }),
    open: wiredDemo(bcdSegmentDemo),
  },
  {
    section: "Seven-segment displays",
    row: circuitRow("display:add3", ADD3, {
      title: "Double-dabble correction: adds 3 to a BCD nibble of 5 or more before the next shift.",
      keywords: `${SEGMENT_WORDS} bcd add 3 correction double dabble`,
    }),
    open: diagram(ADD3),
  },
  ...DIGIT_COUNTS.map((digits): LibraryItem => {
    const circuit = decimalConverter(14, digits);
    return {
      section: "Seven-segment displays",
      row: circuitRow(`display:converter-${digits}`, circuit, {
        label: `Binary to ${digits}-digit BCD`,
        title: "Binary to BCD with gates only. Values past the last digit light OVERFLOW.",
        keywords: `${SEGMENT_WORDS} binary to decimal bcd converter double dabble`,
      }),
      open: diagram(circuit),
    };
  }),
];

export const PART_LIBRARY: LibraryItem[] = [...counters, ...displays];
