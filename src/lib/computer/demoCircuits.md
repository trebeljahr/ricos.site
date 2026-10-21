# Circuit demo integration

`demoCircuits.ts` supplies ordinary, editable `Circuit` values. `CircuitDemo` mounts them in the existing `LogicBuilder` with storage disabled. It owns no simulator. Device examples use `initialFocus` to frame the manual controls and framebuffer on mount; Fit still frames the full circuit. The editor supplies wiring, gate delays, unfolding, clipboard, undo, clock and simulation history.

| Demo | Shared implementation |
| --- | --- |
| Half adder / sum bit | `PRESETS["Half adder"]`; sum-only removes the carry branch |
| Full adder | `PRESETS["Full adder"]`, or the byte adder's existing one-bit module |
| Eight-bit adder | `PRESETS["8-bit full adder"]` with native A/B byte inputs and separate operand lanes |
| Transistor gates | `gateBlueprint(gate, "transistor")` |
| Decoder | Tutorial catalog's built-in decoder |
| Four-way multiplexer | Three instances of the catalog's built-in selector |
| Addressed memory | Bit 0 of the existing `ram16` block; unused write bits grounded |
| Memory-mapped screen / pixel port | `addDataMemory` and its screen, cursor registers and plotter |
| Blitter | `addDataMemory` with its existing blitter and sprite ROM |
| Bank window / VRAM port / big blitter | `addDataMemory` with its existing big-screen card |
| Scanout | `addDataMemory` with dual-port VRAM, scanout and monitor |
| Gate truth table / switch-gate reveal | `CircuitPreview`, a locked builder driven through `LockedClock.input` |

The device benches replace the CPU with ADDRESS and DATA number sources, WRITE ENABLE and READ ENABLE switches, and a clock. Stores occur on rising edges. WRITE ENABLE must be off when clocking a device without storing. This exposes the same address map as the CPU without a second implementation of any port or device. The big-screen card unfolds into the framebuffer, bank register, port and blitter.

`gateLogic.ts` remains an independent truth-table specification, used for comparisons and the physical switch analogy. Analog scopes, byte/text representation explorers, die zoom, abstraction layers and screen-cost charts retain their specialized views. The CPU bench, construction tutorials, seven-segment displays, counters and input-device lessons already use the shared hardware path.

Regression coverage lives in `demoCircuits.test.ts` and the component UI tests. It exercises circuit serialization, all small gate/mux inputs, carry and overflow, selected RAM writes, pixel preservation, bank windows, port wraparound, blitters and scanout. UI checks cover native switches, undo, unfolding, input synchronization and saved-lab isolation.
