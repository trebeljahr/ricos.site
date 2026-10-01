import { useState } from "react";
import {
  asciiCharacter,
  byteBits,
  float8E4M3,
  parseByteBits,
  rgb332,
  signedByte,
} from "src/lib/byteInterpretations";

const examples = [
  { label: "A", value: 65 },
  { label: "red", value: 224 },
  { label: "minus one", value: 255 },
  { label: "zero", value: 0 },
];
const bitWeights = [128, 64, 32, 16, 8, 4, 2, 1];

function Reading({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-t border-white/15 py-4 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className="mt-2 sm:mt-0">
        <span className="block break-all font-mono text-2xl text-white sm:text-3xl">{value}</span>
        <span className="mt-1 block text-sm text-slate-400">{note}</span>
      </dd>
    </div>
  );
}

/** Self-contained demo component; can be registered in MDX when the series is ready. */
export function ByteExplorer() {
  const [input, setInput] = useState("01000001");
  const value = parseByteBits(input);
  const bits = value === null ? null : byteBits(value);
  const color = value === null ? null : rgb332(value);
  const ascii = value === null ? null : asciiCharacter(value);
  const float = value === null ? null : float8E4M3(value);

  function toggleBit(index: number) {
    if (!bits) return;
    const next = bits.split("");
    next[index] = next[index] === "1" ? "0" : "1";
    setInput(next.join(""));
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] text-slate-100 shadow-2xl shadow-black/20">
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Input / 8 bits
            </span>
            <span className="font-mono text-xs text-slate-500">MSB → LSB</span>
          </div>
          <label htmlFor="byte-bits" className="mt-9 block text-sm text-slate-300">
            Type eight bits
          </label>
          <input
            id="byte-bits"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={value === null}
            aria-describedby="byte-help"
            className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-mono text-2xl tracking-[0.12em] text-white outline-none transition-colors focus:border-cyan-300 sm:text-4xl"
          />
          <p
            id="byte-help"
            className={`mt-2 min-h-5 text-sm ${value === null ? "text-amber-300" : "text-slate-400"}`}
          >
            {value === null
              ? "Enter exactly eight 0s or 1s. Spaces are allowed."
              : "Click a bit below to flip it."}
          </p>
          <fieldset className="mt-7 grid grid-cols-8 gap-1.5" aria-label="Toggle individual bits">
            {bitWeights.map((weight, index) => (
              <button
                key={weight}
                type="button"
                disabled={!bits}
                onClick={() => toggleBit(index)}
                aria-label={`Bit ${7 - index}: ${bits?.[index] ?? "unknown"}. Toggle bit.`}
                aria-pressed={bits?.[index] === "1"}
                className={`aspect-[0.7] rounded-lg border font-mono text-xl transition-all duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 sm:text-3xl ${bits?.[index] === "1" ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/20 bg-white/5 text-slate-300"}`}
              >
                {bits?.[index] ?? "·"}
              </button>
            ))}
          </fieldset>
          <div className="mt-2 grid grid-cols-8 gap-1.5 text-center font-mono text-[10px] text-slate-500 sm:text-xs">
            {bitWeights.map((weight) => (
              <span key={weight}>{weight}</span>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setInput(byteBits(example.value))}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-300 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                {example.label}
              </button>
            ))}
          </div>
          <p className="mt-10 max-w-md text-sm leading-6 text-slate-400">
            Same eight switches. Different rules for reading them. Change one bit and watch every
            result move.
          </p>
        </div>

        <div
          className="border-t border-white/10 bg-[#151e2e] p-6 sm:p-10 lg:border-l lg:border-t-0 lg:p-12"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Interpretations
            </span>
            <span className="font-mono text-xs text-slate-500">
              {value === null ? "—" : `0x${value.toString(16).padStart(2, "0").toUpperCase()}`}
            </span>
          </div>
          <dl className="mt-8">
            <Reading label="Unsigned" value={value?.toString() ?? "—"} note="Integer, 0 to 255" />
            <Reading
              label="Signed"
              value={value === null ? "—" : signedByte(value).toString()}
              note="Two’s complement, −128 to 127"
            />
            <Reading
              label="Fixed point"
              value={value === null ? "—" : (signedByte(value) / 16).toString()}
              note="Signed Q4.4: divide the integer by 16"
            />
            <Reading
              label="Float"
              value={float === null ? "—" : Number.isNaN(float) ? "NaN" : String(float)}
              note="Illustrative E4M3: 1 sign · 4 exponent · 3 fraction bits"
            />
            <Reading
              label="ASCII"
              value={value === null ? "—" : (ascii ?? "No printable character")}
              note="Printable 7-bit ASCII: codes 32–126"
            />
            <Reading
              label="Unicode"
              value={
                value === null ? "—" : `U+${value.toString(16).padStart(4, "0").toUpperCase()}`
              }
              note="Code point for this value; control codes may not render"
            />
            <Reading
              label="Latin-1"
              value={
                value === null
                  ? "—"
                  : value >= 32 && value !== 127 && value < 160
                    ? String.fromCharCode(value)
                    : value >= 160
                      ? String.fromCharCode(value)
                      : "Control code"
              }
              note="ISO-8859-1 maps each byte to one code point"
            />
          </dl>
          <div className="mt-6 border-t border-white/15 pt-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Color</h3>
              <span className="font-mono text-xs text-slate-400">
                {color?.hex.toUpperCase() ?? "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="h-28 rounded-xl border border-white/10 transition-colors duration-300 sm:h-36"
                style={{ backgroundColor: color?.hex ?? "transparent" }}
                aria-label={`RGB332 color ${color?.hex ?? "unavailable"}`}
                role="img"
              />
              <div
                className="h-28 rounded-xl border border-white/10 transition-colors duration-300 sm:h-36"
                style={{
                  backgroundColor:
                    value === null ? "transparent" : `rgb(${value}, ${value}, ${value})`,
                }}
                aria-label={`Grayscale color ${value ?? "unavailable"}`}
                role="img"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <span>RGB332 · 3 red, 3 green, 2 blue</span>
              <span>Grayscale · same value in R, G, B</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
