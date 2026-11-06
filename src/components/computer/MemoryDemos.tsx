import { memoryByteDemo, memoryCellDemo, smallRamDemo } from "../../lib/computer/memoryDemos";
import { CircuitDemo } from "./CircuitDemo";

export const MemoryCellDemo = () => (
  <CircuitDemo makeCircuit={memoryCellDemo} label="One addressable memory cell" showcase />
);
export const MemoryByteDemo = () => (
  <CircuitDemo makeCircuit={memoryByteDemo} label="One addressable byte" showcase />
);
export const MemoryAddressDemo = () => (
  <CircuitDemo makeCircuit={smallRamDemo} label="Bytes on a shared data bus" showcase />
);
