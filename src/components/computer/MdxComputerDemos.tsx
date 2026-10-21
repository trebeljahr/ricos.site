import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LazyMount } from "./LazyMount";

/** Large circuit code loads only when that chapter embed approaches the viewport. */
function chapterDemo<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
  label: string,
  height = 650,
) {
  const placeholder = (
    <div
      className="not-prose my-6 flex items-center justify-center rounded border border-dashed border-gray-300 px-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      style={{ minHeight: height }}
    >
      {label} loads when you scroll here.
    </div>
  );
  const Component = dynamic<Props>(load, { ssr: false, loading: () => placeholder });
  return function ChapterDemo(props: Props) {
    return (
      <LazyMount height="auto" label={label} placeholder={placeholder}>
        <Component {...props} />
      </LazyMount>
    );
  };
}

export const COMPUTER_MDX_DEMOS = {
  ByteExplorer: chapterDemo(
    () => import("./ByteExplorer").then((module) => module.ByteExplorer),
    "Byte explorer",
  ),
  FourByteExplorer: chapterDemo(
    () => import("./FourByteExplorer").then((module) => module.FourByteExplorer),
    "Four-byte explorer",
  ),
  SwitchStates: chapterDemo(
    () => import("./SwitchStates").then((module) => module.SwitchStates),
    "Switch states",
  ),
  Codebook: chapterDemo(() => import("./Codebook").then((module) => module.Codebook), "Codebook"),
  CodebookMismatch: chapterDemo(
    () => import("./CodebookMismatch").then((module) => module.CodebookMismatch),
    "Codebook comparison",
  ),
  LetterCodebook: chapterDemo(
    () => import("./LetterCodebook").then((module) => module.LetterCodebook),
    "Letter codebook",
  ),
  AsciiTyper: chapterDemo(
    () => import("./AsciiTyper").then((module) => module.AsciiTyper),
    "ASCII typer",
  ),
  EndianReader: chapterDemo(
    () => import("./EndianReader").then((module) => module.EndianReader),
    "Byte order explorer",
  ),
  AbstractionLayers: chapterDemo(
    () => import("./AbstractionLayers").then((module) => module.AbstractionLayers),
    "Layers of abstraction",
  ),
  DieZoom: chapterDemo(
    () => import("./DieZoom").then((module) => module.DieZoom),
    "Chip die explorer",
  ),
  SwitchLogic: chapterDemo(
    () => import("./SwitchLogic").then((module) => module.SwitchLogic),
    "Switch logic",
  ),
  GateTruthTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.GateTruthTable),
    "Gate truth table",
  ),
  TransistorGates: chapterDemo(
    () => import("./TransistorGates").then((module) => module.TransistorGates),
    "Transistor gate explorer",
  ),
  TransistorGateLessons: chapterDemo(
    () => import("./ChapterCircuitLessons").then((module) => module.TransistorGateLessons),
    "Transistor construction lessons",
  ),
  UniversalGates: chapterDemo(
    () => import("./UniversalGates").then((module) => module.UniversalGates),
    "Universal gate construction",
  ),
  AdditionTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.AdditionTable),
    "One-bit addition table",
  ),
  HalfAdder: chapterDemo(() => import("./Adders").then((module) => module.HalfAdder), "Half adder"),
  FullAdderTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.FullAdderTable),
    "Full-adder truth table",
  ),
  FullAdder: chapterDemo(() => import("./Adders").then((module) => module.FullAdder), "Full adder"),
  EightBitAdder: chapterDemo(
    () => import("./Adders").then((module) => module.EightBitAdder),
    "Eight-bit adder",
  ),
  LazyLogicTutorial: chapterDemo(
    () => import("./tutorial/LazyLogicTutorial").then((module) => module.LazyLogicTutorial),
    "Circuit construction challenge",
    820,
  ),
  SignalEdges: chapterDemo(
    () => import("./SignalEdges").then((module) => module.SignalEdges),
    "Clock signal edges",
  ),
  ClockScope: chapterDemo(
    () => import("./ClockScope").then((module) => module.ClockScope),
    "Clock oscilloscope",
  ),
  DecoderDemo: chapterDemo(
    () => import("./AddressRouting").then((module) => module.DecoderDemo),
    "Decoder circuit",
  ),
  DecoderLesson: chapterDemo(
    () => import("./ChapterCircuitLessons").then((module) => module.DecoderLesson),
    "Decoder construction lesson",
  ),
  MultiplexerDemo: chapterDemo(
    () => import("./AddressRouting").then((module) => module.MultiplexerDemo),
    "Multiplexer circuit",
  ),
  MemoryAddressDemo: chapterDemo(
    () => import("./AddressRouting").then((module) => module.MemoryAddressDemo),
    "Memory address circuit",
  ),
  SignedNumberExplorer: chapterDemo(
    () => import("./SignedNumbers").then((module) => module.SignedNumberExplorer),
    "Signed number representations",
  ),
  SignedArithmetic: chapterDemo(
    () => import("./SignedNumbers").then((module) => module.SignedArithmetic),
    "Signed arithmetic circuit",
  ),
  TruthTableScale: chapterDemo(
    () => import("./BooleanExplainer").then((module) => module.TruthTableScale),
    "Truth-table size explorer",
  ),
  BooleanNotation: chapterDemo(
    () => import("./BooleanExplainer").then((module) => module.BooleanNotation),
    "Boolean notation explorer",
  ),
  AluArchitectureComparison: chapterDemo(
    () => import("./AluArchitectureComparison").then((module) => module.AluArchitectureComparison),
    "ALU architecture comparison",
  ),
  SemiconductorDemo: chapterDemo(
    () => import("./SemiconductorDemo").then((module) => module.SemiconductorDemo),
    "Semiconductor explorer",
  ),
};
