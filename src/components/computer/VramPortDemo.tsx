import { useState } from "react";
import { blankFrame, litPixels } from "../../lib/computer/video";
import {
  BIG_FRAME_BYTES,
  BIG_PORT,
  BIG_SCREEN,
  byteBits,
  hex,
  portStep,
} from "../../lib/computerStepper";
import {
  buttonClass,
  byteWhere,
  ClickLayer,
  captionClass,
  hintClass,
  LastStore,
  noteClass,
  readoutClass,
  Slider,
} from "./DeviceDemoParts";
import { ScreenGrid } from "./ScreenGrid";

const BYTES = Array.from({ length: BIG_FRAME_BYTES }, (_, byte) => byte);
/** LED side in px. A byte's cell in the click layer is 8 LEDs wide and one high. */
const PIXEL = 9;

const ADDR = hex(BIG_PORT.addr);
const DATA = hex(BIG_PORT.data);
const STEP = hex(BIG_PORT.step);

/**
 * The big screen's port, without a CPU: ADDR points at one of the 128 bytes,
 * a store to DATA writes that byte and moves ADDR on, and STEP says how far.
 * Click a byte to set ADDR, then store to DATA again and again.
 */
export function VramPortDemo() {
  const [frame, setFrame] = useState(() => blankFrame(BIG_SCREEN));
  const [addr, setAddr] = useState(0);
  const [down, setDown] = useState(false);
  /** The byte the next store to DATA writes. */
  const [value, setValue] = useState(255);
  const [written, setWritten] = useState<number | null>(null);
  const [store, setStore] = useState(`STM ${ADDR} ← 0`);

  function chooseAddr(next: number) {
    setAddr(next);
    setStore(`STM ${ADDR} ← ${next}`);
  }

  function chooseStep(next: boolean) {
    setDown(next);
    setStore(
      `STM ${STEP} ← ${Number(next)}: ADDR moves on by ${portStep(next)}, ${next ? "one row down" : "one byte across"}`,
    );
  }

  function storeData() {
    const next = (addr + portStep(down)) & (BIG_FRAME_BYTES - 1);
    setFrame(frame.map((old, byte) => (byte === addr ? value : old)));
    setWritten(addr);
    setAddr(next);
    setStore(
      `STM ${DATA} ← ${hex(value)}: byte ${addr} written, ADDR moves on by ${portStep(down)} to ${next}`,
    );
  }

  return (
    <section className="not-prose flow-para" aria-label="Big-screen port demo">
      <figure className="flow-label">
        <figcaption className={captionClass}>Big screen: 32×32 pixels, 128 bytes</figcaption>
        <div className="relative w-max">
          <ScreenGrid rows={frame} size={BIG_SCREEN} label="Big screen" pixel={PIXEL} />
          <ClickLayer columns={4} rows={BIG_SCREEN.height}>
            {BYTES.map((byte) => (
              <button
                key={byte}
                type="button"
                aria-label={`Byte ${byte}`}
                aria-pressed={byte === addr}
                data-written={byte === written || undefined}
                onClick={() => chooseAddr(byte)}
                className="cursor-pointer hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-cyan-300 data-[written]:shadow-[inset_0_0_0_1px_#ffd84d]"
              />
            ))}
          </ClickLayer>
        </div>
        <p className={hintClass}>
          Each row is 4 bytes of 8 pixels. Click a byte to point ADDR at it. The blue outline is the
          byte ADDR points at, the yellow one the byte the last store wrote.
        </p>
      </figure>

      <div className="flow-tight">
        <Slider name="ADDR" max={BIG_FRAME_BYTES - 1} value={addr} onChange={chooseAddr}>
          ADDR ({ADDR}) = {addr}: {byteWhere(addr)}
        </Slider>
        <div className="flex flex-wrap items-center gap-x-stack gap-y-hair">
          <fieldset className="m-0 flex items-center gap-tight border-0 p-0 text-sm text-gray-800 dark:text-gray-200">
            <legend className="sr-only">STEP register</legend>
            <span className="w-20">STEP</span>
            <button
              type="button"
              className={buttonClass}
              aria-pressed={!down}
              onClick={() => chooseStep(false)}
            >
              Across
            </button>
            <button
              type="button"
              className={buttonClass}
              aria-pressed={down}
              onClick={() => chooseStep(true)}
            >
              Down
            </button>
          </fieldset>
          <output aria-label="STEP" className={readoutClass}>
            STEP ({STEP}) = {Number(down)}: ADDR moves on by {portStep(down)}
          </output>
        </div>
        <Slider name="Byte" label="Byte to store" max={255} value={value} onChange={setValue}>
          {hex(value)} = {byteBits(value)}
        </Slider>
      </div>

      <div className="flex flex-wrap items-center gap-tight">
        <button type="button" className={buttonClass} onClick={storeData}>
          Store {hex(value)} in DATA
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={litPixels(frame) === 0}
          onClick={() => {
            setFrame(blankFrame(BIG_SCREEN));
            setWritten(null);
            setStore("Screen cleared");
          }}
        >
          Clear the screen
        </button>
      </div>

      <LastStore>{store}</LastStore>

      <p className={noteClass}>
        The port is three addresses. ADDR ({ADDR}) holds a byte number from 0 to 127. A store to
        DATA ({DATA}) writes the byte ADDR points at, and then ADDR moves on by itself: by 1, or by
        4 when bit 0 of STEP ({STEP}) is set. A row is 4 bytes, so a step of 4 lands on the same
        columns one row down. Past byte 127, ADDR wraps around to the start. A program stores ADDR
        once, then one byte per store. It does no address arithmetic.
      </p>
    </section>
  );
}
