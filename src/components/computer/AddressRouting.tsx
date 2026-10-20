import { routingDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

const decoder = () => routingDemo("decoder");
const mux = () => routingDemo("mux");
const memory = () => routingDemo("memory");

export function DecoderDemo() {
  return (
    <CircuitDemo makeCircuit={decoder} label="Two-to-four decoder">
      A1 and A0 select one of Y0–Y3. Unfold the switches to trace the decoder's gates, or change the
      wiring.
    </CircuitDemo>
  );
}

export function MultiplexerDemo() {
  return (
    <CircuitDemo makeCircuit={mux} label="Four-to-one multiplexer">
      A0 selects within each pair; A1 selects the pair. Flip D0–D3 and follow OUT. Unfold a selector
      to see its gates.
    </CircuitDemo>
  );
}

export function MemoryAddressDemo() {
  return (
    <CircuitDemo makeCircuit={memory} label="Sixteen addressed bits">
      Choose a cell with A0–A3 and set DATA. Turn on WRITE ENABLE and step through a rising clock
      edge to store it. Turn WRITE ENABLE off to read without writing. Each cell uses bit 0 of the
      CPU's sixteen-byte RAM.
    </CircuitDemo>
  );
}
