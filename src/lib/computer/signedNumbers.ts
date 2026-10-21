import { type Circuit, PRESETS, type Snapshot } from "./logic";
import { busPorts, CircuitKit, type Source } from "./tutorial/kit";

export type SignedWidth = 4 | 8;
export type IntegerEncoding = "unsigned" | "sign-magnitude" | "ones-complement" | "twos-complement";

export const INTEGER_ENCODINGS: { id: IntegerEncoding; label: string }[] = [
  { id: "unsigned", label: "Unsigned" },
  { id: "sign-magnitude", label: "Sign + magnitude" },
  { id: "ones-complement", label: "Ones’ complement" },
  { id: "twos-complement", label: "Two’s complement" },
];

export const bitMask = (width: SignedWidth) => 2 ** width - 1;
export const bitPattern = (raw: number, width: SignedWidth) =>
  (raw & bitMask(width)).toString(2).padStart(width, "0");

/** Interpretation only. Live addition uses the circuit below. Preserve negative zero. */
export function decodeInteger(raw: number, width: SignedWidth, encoding: IntegerEncoding): number {
  const value = raw & bitMask(width);
  const sign = 2 ** (width - 1);
  if (encoding === "unsigned" || value < sign) return value;
  if (encoding === "sign-magnitude") return -(value & (sign - 1));
  if (encoding === "ones-complement") return -(bitMask(width) ^ value);
  return value - 2 ** width;
}

export const displayInteger = (value: number) =>
  Object.is(value, -0) ? "−0" : String(value).replace("-", "−");

export function signedAdderInputs(a: number, b: number, width: SignedWidth, subtract: boolean) {
  return {
    sub: subtract,
    ...Object.fromEntries(
      Array.from({ length: width }, (_, bit) => [`a${bit}`, Boolean(a & (1 << bit))]),
    ),
    ...Object.fromEntries(
      Array.from({ length: width }, (_, bit) => [`b${bit}`, Boolean(b & (1 << bit))]),
    ),
  };
}

/** The lab's full-adder blocks, with B XOR SUB and SUB wired into the first carry. */
export function signedAdderCircuit(width: SignedWidth): Circuit {
  const fullAdder = PRESETS["8-bit full adder"].nodes.find(
    (node) => node.type === "module",
  )?.module;
  if (!fullAdder) throw new Error("Signed addition needs the lab’s full-adder module");
  const kit = new CircuitKit(
    `${width}-bit signed addition and subtraction`,
    [{ id: "sub", label: "SUBTRACT" }, ...busPorts("a", "A", width), ...busPorts("b", "B", width)],
    [
      ...busPorts("out", "RESULT", width),
      { id: "carry", label: "CARRY OUT" },
      { id: "overflow", label: "SIGNED OVERFLOW" },
    ],
  );
  let carry: Source = "sub";
  let signCarry: Source = "sub";
  for (let bit = 0; bit < width; bit++) {
    if (bit === width - 1) signCarry = carry;
    const effectiveB = kit.gate("xor", [`b${bit}`, "sub"], {
      id: `invert${bit}`,
      label: `B${bit} XOR SUB`,
    });
    const adder = kit.part("full-adder", fullAdder, [`a${bit}`, effectiveB, carry], {
      id: `adder${bit}`,
      label: `FULL ADDER ${bit}`,
    });
    kit.out(`out${bit}`, [adder, 0]);
    carry = [adder, 1];
  }
  kit.out("carry", carry);
  kit.out(
    "overflow",
    kit.gate("xor", [signCarry, carry], { id: "overflow-xor", label: "CARRY INTO SIGN XOR OUT" }),
  );
  const circuit = kit.build();
  const defaults = signedAdderInputs(2, -5, width, false);
  return {
    ...circuit,
    // Keep the carry chain vertical, like the existing eight-bit adder bench.
    nodes: circuit.nodes.map((node) => {
      const bit = Number(node.id.match(/\d+$/)?.[0] ?? 0);
      const y = 180 + bit * 170;
      const point =
        node.id === "sub"
          ? { x: 40, y: 40 }
          : node.id.startsWith("adder")
            ? { x: 540, y }
            : node.id.startsWith("invert")
              ? { x: 300, y: y + 65 }
              : /^a\d/.test(node.id)
                ? { x: 40, y }
                : /^b\d/.test(node.id)
                  ? { x: 40, y: y + 80 }
                  : /^out\d/.test(node.id)
                    ? { x: 870, y }
                    : node.id === "overflow-xor"
                      ? { x: 540, y: 180 + width * 170 }
                      : { x: 870, y: 180 + width * 170 + (node.id === "carry" ? 90 : 0) };
      return { ...node, ...point, value: defaults[node.id as keyof typeof defaults] ?? node.value };
    }),
  };
}

/** Read the same snapshot displayed by the locked LogicBuilder. No arithmetic engine here. */
export function readSignedAdder(snapshot: Snapshot, width: SignedWidth) {
  const bus = (prefix: string) =>
    Array.from({ length: width }, (_, bit) =>
      snapshot.values[`${prefix}${bit}`] ? 2 ** bit : 0,
    ).reduce((sum, value) => sum + value, 0);
  return {
    a: bus("a"),
    b: bus("b"),
    raw: bus("out"),
    effectiveB: bus("invert"),
    subtract: Boolean(snapshot.values.sub),
    carry: Boolean(snapshot.values.carry),
    overflow: Boolean(snapshot.values.overflow),
  };
}
