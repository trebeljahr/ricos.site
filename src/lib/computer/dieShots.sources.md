# Dixon region identification

The runtime photograph is Martijn Boer's 22,036 × 13,288 Dixon die image.
[Its Commons annotations](https://commons.wikimedia.org/wiki/File:Intel-pentium-ii-dixon-die-shot-high-resolution-stitched.jpg)
give the L2 cache, individual decoder and alignment-mark boxes directly.

The additional core regions are **visual matches**, not annotations supplied
with that Dixon photograph. Their outlines are approximate and the viewer says
so whenever one is selected.

## Matched core layout

[nand2mario's P6 ROMs and PLAs research](https://nand2mario.github.io/wiki/p6/roms/)
contains a labelled Deschutes photograph. Rotate it 90° counterclockwise to
compare with Dixon's core, to the right of the added L2 cache. Match each block
individually: a single affine transform does not fit the entire revised core.

Main regions follow the labelled functional blocks. Smaller functional targets
appear under CLOSER. The reference's tentative yellow ROM/PLA, register-array and
capacitor identifications appear separately under CANDIDATES · UNCONFIRMED.
Their captions use conditional language, the LCD labels them CANDIDATE, and the
source note states that their function and location are unconfirmed. Candidate
boxes use an amber outline and do not appear in the main overview.

| Viewer region | Visual match on Dixon |
| --- | --- |
| L1 data cache | Four purple memory-array groups in a square near the bottom centre of the core, with central access circuitry. |
| L1 instruction cache | Four purple memory-array groups on the right, arranged around a larger central logic region. |
| Microcode ROM | Dark segmented ROM arrays at the upper right, above the full decoder. |
| Floating point | Upper-left arithmetic blocks of the core; the box includes both FEU and adjacent MIU conversion logic. |
| Integer arithmetic | Repeated execution structures immediately below the floating-point region. |
| MMX | Tall execution structures immediately to the right of the floating-point and integer regions. |
| Scheduler | The two main reservation-station array groups immediately to the right of MMX. |
| Branch prediction | Bottom-right BTB logic and its adjacent storage arrays, beneath the instruction cache. |
| Instruction fetch | IFU logic between the instruction cache and the central core; its instruction buffer is a nested close-up. |
| Register renaming | Central RAT logic below the execution and scheduling blocks. |
| Reorder / retirement | ROB/RRF region to the left of the microcode ROM and above the decoder region; the individual arrays remain candidates. |
| Memory ordering | MOB logic between the left control blocks and the central register-renaming region. |
| Address translation | DTLB/control area immediately left of the L1 data cache, with its bottom storage array as a nested close-up. |
| Allocation | ALLOC block above the L1 data cache and below the register-alias logic. |
| Bus interface | BIU/control region along the left side of the core. Its irregular footprint is represented by an approximate rectangular crop. |
| Branch addresses | BAC block immediately to the right of allocation. |
| Page-miss handler | PFU/PMH region beside the integer execution block, below floating-point execution. |
| FP conversion | MIU portion of the existing floating-point region. |
| Branch-target storage | BTB memory arrays along the bottom right, nested under branch prediction. |

Candidate close-ups match the reference's proposed FROM strip beside MIU,
microcode-entry array above the rotated full decoder, nearby decoder-control
arrays, possible RRF/ROB arrays in the retirement region, and one possible
decoupling-capacitor strip beside the reservation station. These are research
hypotheses, not recovered circuits or confirmed Dixon identifications. The
unlocated integer constant ROM (CROM) is not given a box.

The overview sorts larger boxes behind smaller ones so overlapping rectangular
crops do not prevent selecting the smaller region.

## Functional descriptions

- [Intel Architecture Optimization Reference Manual](https://download.intel.com/design/PentiumII/manuals/24512701.pdf): P6 execution ports, integer/FP/MMX resources, reservation station, instruction fetch and separate 16 KB caches.
- [P6 Family Hardware Developer's Manual](https://download.intel.com/design/PentiumII/manuals/24400101.pdf): instruction fetch/decode, register aliasing, allocation, reorder buffer, memory operations and retirement.
- [Intel's 1999 P6 microarchitecture overview](https://www.intel.com/content/dam/www/public/us/en/documents/research/1999-vol03-iss-2-intel-technology-journal.pdf): functional blocks and data flow.
- [Peter Bosch's Pentium II microcode research](https://pbx.sh/pentiumii-part1/): microcode ROM extraction from Dixon photographs and the distinction between the ROM and decoder PLAs.
- [Bosch's ROM reconstruction write-up](https://pbx.sh/pladecode/): directly identified Deschutes ROM images, array structure and read-only microcode storage.

The annotated reference image is research evidence only. It is not shipped as
a site asset, and its annotation copyright is not inferred from the underlying
photograph's CC0 status.
