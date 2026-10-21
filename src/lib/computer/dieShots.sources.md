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

Only the labelled functional regions are used. The reference's tentative yellow
ROM/PLA candidates, including FROM, the entry-point PLA and putative individual
register arrays, are not treated as established locations.

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

## Functional descriptions

- [Intel Architecture Optimization Reference Manual](https://download.intel.com/design/PentiumII/manuals/24512701.pdf): P6 execution ports, integer/FP/MMX resources, reservation station, instruction fetch and separate 16 KB caches.
- [Intel's 1999 P6 microarchitecture overview](https://www.intel.com/content/dam/www/public/us/en/documents/research/1999-vol03-iss-2-intel-technology-journal.pdf): functional blocks and data flow.
- [Peter Bosch's Pentium II microcode research](https://pbx.sh/pentiumii-part1/): microcode ROM extraction from Dixon photographs and the distinction between the ROM and decoder PLAs.
- [Bosch's ROM reconstruction write-up](https://pbx.sh/pladecode/): directly identified Deschutes ROM images, array structure and read-only microcode storage.

The annotated reference image is research evidence only. It is not shipped as
a site asset, and its annotation copyright is not inferred from the underlying
photograph's CC0 status.
