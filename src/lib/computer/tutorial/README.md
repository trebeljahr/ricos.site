# Construction lessons

A lesson supplies a behavior `goal`, short `intro`, `spec`, allowed `palette`,
fixed ports and optional reasoning `hints`. `LogicTutorial` never renders
reference steps or offers reference edits. `requestedHints` is the shared
explicit-request API for later keyboard and interrupt lessons. Pass the current
circuit and fresh grade; depth zero returns no hints. Dismissal, reset and level
changes clear depth. `[data-tutorial-hint]` identifies the native keyboard button.
`[data-tutorial-check]` identifies Check. No global hint shortcut claims another
builder's keyboard ownership.

References are validation, comparison and built-in part assets. Grading checks
behavior and explicit allowed parts, never reference matching. Boxed learned
parts are checked through their actual ordered ports. CMOS exercises additionally
check rail reachability; the general simulator remains a directed Boolean switch
model rather than an analog electrical solver.

Counter `practice` metadata groups one core construction with independently saved
width/mode mastery variants. All original level ids remain in `LEVELS` and the
part catalog. `LEARNING_LEVELS` selects the core for the main picker. No progress
schema migration is needed: the v1 storage key, solved circuits, drafts, skips,
and part preference remain unchanged. Existing valid solutions stay earned.

Reusable own parts retain their circuits. Small combinational recognition uses
the existing exhaustive proof. Larger truth lessons and stateful lessons also
register a trusted construction check, cached by implementation fingerprint.
Sequence and sampled proofs are labeled accordingly; they do not claim temporal
or exhaustive equivalence. Changes invalidate the identity fingerprint.

The free builder's Learning menu uses `BUILDER_LESSONS` from `lessons.ts`.
It includes the main ladder, standalone NAND/NOR challenges, and one entry per
parameterized family. Variants stay in each lesson's parameter picker. Lessons
open without sequential locks from the bench. The bench remains mounted with
its undo history and timeline; opening a lesson pauses it and hides it from
keyboard and pointer interaction. Lesson drafts use the existing progress store.

The ladder goes from transistors up. `cmos-not` is the first thing a new reader
meets, and its board starts with only A, OUT, VDD and GND. Both it and `cmos-nand`
are required: later levels open once they are solved or skipped. `cmos-and`,
`cmos-or`, `cmos-nor`, `cmos-xor` and `cmos-xnor` are practice off the ladder, for
the transistor builder demo and its chapter (`TRANSISTOR_GATE_LESSONS`). A reader with progress further up the ladder
stays unlocked, because a sequential ladder only gates levels past the furthest
one solved or skipped. Saved boards are restored as they are: only the two rails
and the ports are locked.

Construction hints disclose an idea, first step, signal plan, and experiment on
request. Primitive gate lessons retain their gate-count stage. RAM-cell and bus
lessons are optional so existing course progress does not acquire a new lock.
The RAM palette still accepts the earlier latch-and-gates construction.

The optional storage follow-ons cover gated, JK and T latches; SR, JK and T
flip-flops; and an eight-stage shift register. The transparent JK/T latch intros
warn about feedback races; their edge-triggered counterparts test repeated
toggles. DRAM and flash each start with one cell before a 4 × 4 addressed array.
The DRAM checks include refresh and four idle clock cycles to charge loss. Flash
checks include one-way programming, unselected writes and global erase. Array
references assemble learned cell modules with a decoder and output OR trees;
their built-in parts remain the existing free-builder presets.

Bus checks use the shared simulator's native `snapshot.buses` values, including
Z and X, rather than Boolean lamps. Custom specs can name `observed` output nodes
for feedback analysis. Boolean simplification must not infer constants or
pass-through gates from bus parts. The splitter's zero reading for Z/X cannot
substitute for checking the bus itself.
