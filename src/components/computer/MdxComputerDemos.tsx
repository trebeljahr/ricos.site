import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ComputerEmbedContext } from "./ComputerEmbedContext";
import { LazyMount } from "./LazyMount";

/** Large circuit code loads only when that chapter embed approaches the viewport. */
function chapterDemo<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
  label: string,
  height = 650,
  wide = false,
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
      <div className="not-prose" data-computer-embed={wide ? "wide" : "inline"}>
        <ComputerEmbedContext.Provider value={true}>
          <LazyMount height="auto" label={label} placeholder={placeholder}>
            <Component {...props} />
          </LazyMount>
        </ComputerEmbedContext.Provider>
      </div>
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
  LetterTyper: chapterDemo(
    () => import("./LetterTyper").then((module) => module.LetterTyper),
    "Letter typer",
  ),
  AsciiTable: chapterDemo(
    () => import("./AsciiTable").then((module) => module.AsciiTable),
    "ASCII table",
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
    850,
    true,
  ),
  SwitchLogic: chapterDemo(
    () => import("./SwitchLogic").then((module) => module.SwitchLogic),
    "Switch logic",
    650,
    true,
  ),
  TransistorComparison: chapterDemo(
    () => import("./SwitchLogic").then((module) => module.TransistorComparison),
    "Compare PMOS and NMOS",
    450,
    true,
  ),
  TransistorSwitches: chapterDemo(
    () => import("./SwitchLogic").then((module) => module.TransistorSwitches),
    "Electrically controlled switches",
    650,
    true,
  ),
  GateTruthTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.GateTruthTable),
    "Gate truth table",
    600,
    true,
  ),
  TransistorGates: chapterDemo(
    () => import("./TransistorGates").then((module) => module.TransistorGates),
    "Transistor gate explorer",
    650,
    true,
  ),
  TransistorGateLessons: chapterDemo(
    () => import("./ChapterCircuitLessons").then((module) => module.TransistorGateLessons),
    "Transistor construction lessons",
    650,
    true,
  ),
  UniversalGates: chapterDemo(
    () => import("./UniversalGates").then((module) => module.UniversalGates),
    "Universal gate construction",
    650,
    true,
  ),
  AdditionTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.AdditionTable),
    "One-bit addition table",
    600,
    true,
  ),
  HalfAdder: chapterDemo(
    () => import("./Adders").then((module) => module.HalfAdder),
    "Half adder",
    650,
    true,
  ),
  FullAdderTable: chapterDemo(
    () => import("./TruthTables").then((module) => module.FullAdderTable),
    "Full-adder truth table",
    600,
    true,
  ),
  FullAdder: chapterDemo(
    () => import("./Adders").then((module) => module.FullAdder),
    "Full adder",
    650,
    true,
  ),
  EightBitAdder: chapterDemo(
    () => import("./Adders").then((module) => module.EightBitAdder),
    "Eight-bit adder",
    650,
    true,
  ),
  LazyLogicTutorial: chapterDemo(
    () => import("./tutorial/LazyLogicTutorial").then((module) => module.LazyLogicTutorial),
    "Circuit construction challenge",
    820,
    true,
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
    650,
    true,
  ),
  DecoderLesson: chapterDemo(
    () => import("./ChapterCircuitLessons").then((module) => module.DecoderLesson),
    "Decoder construction lesson",
    650,
    true,
  ),
  MultiplexerDemo: chapterDemo(
    () => import("./AddressRouting").then((module) => module.MultiplexerDemo),
    "Multiplexer circuit",
    650,
    true,
  ),
  MemoryAddressDemo: chapterDemo(
    () => import("./AddressRouting").then((module) => module.MemoryAddressDemo),
    "Memory address circuit",
    650,
    true,
  ),
  SignedNumberExplorer: chapterDemo(
    () => import("./SignedNumbers").then((module) => module.SignedNumberExplorer),
    "Signed number representations",
  ),
  SignedArithmetic: chapterDemo(
    () => import("./SignedNumbers").then((module) => module.SignedArithmetic),
    "Signed arithmetic circuit",
    650,
    true,
  ),
  BooleanCircuitDemo: chapterDemo(
    () => import("./BooleanCircuitDemo").then((module) => module.BooleanCircuitDemo),
    "Boolean expression and matching circuit",
    850,
    true,
  ),
  // Shelved demo: keep existing chapter embeds valid without rendering a placeholder.
  TruthTableScale: () => null,
  AluArchitectureComparison: chapterDemo(
    () => import("./AluArchitectureComparison").then((module) => module.AluArchitectureComparison),
    "ALU architecture comparison",
    650,
    true,
  ),
  SemiconductorDemo: chapterDemo(
    () => import("./SemiconductorDemo").then((module) => module.SemiconductorDemo),
    "Semiconductor explorer",
  ),
};
