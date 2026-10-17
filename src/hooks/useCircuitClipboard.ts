import { useCallback, useEffect, useRef } from "react";
import {
  CIRCUIT_CLIPBOARD_LIMIT,
  type CircuitClip,
  copyCircuit,
  parseCircuitClip,
} from "../lib/computer/circuitClipboard";
import type { Circuit } from "../lib/computer/logic";

type Options = {
  enabled: boolean;
  scope: string;
  ownsEvent: (target: EventTarget | null) => boolean;
  circuit: Circuit;
  nodes: string[];
  wires: string[];
  unfolded: readonly string[];
  center: () => { x: number; y: number };
  insert: (clip: CircuitClip, point: { x: number; y: number }) => boolean;
  message: (text: string) => void;
};
const editingText = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest("input,textarea,select,[contenteditable]:not([contenteditable=false])"));

/** Native copy/paste events keep keyboard clipboard access within the browser gesture. */
export function useCircuitClipboard(options: Options) {
  const live = useRef(options);
  live.current = options;
  const repeated = useRef({ text: "", count: 0, scope: "", center: { x: 0, y: 0 } });
  const encode = useCallback(() => {
    const o = live.current;
    const text = JSON.stringify(copyCircuit(o.circuit, o.nodes, o.wires, o.unfolded));
    if (text.length > CIRCUIT_CLIPBOARD_LIMIT)
      throw new Error("Circuit is too large for the clipboard.");
    return text;
  }, []);
  const insert = useCallback((text: string) => {
    const o = live.current,
      clip = parseCircuitClip(text);
    if (!clip) {
      o.message("Clipboard does not contain a supported circuit, or exceeds parser limits.");
      return;
    }
    const last = repeated.current,
      same = last.text === text && last.scope === o.scope;
    const count = same ? last.count + 1 : 1,
      center = same ? last.center : o.center();
    if (o.insert(clip, { x: center.x + count * 24, y: center.y + count * 24 }))
      repeated.current = { text, count, scope: o.scope, center };
  }, []);
  useEffect(() => {
    const allowed = (event: ClipboardEvent) =>
      live.current.enabled &&
      !event.defaultPrevented &&
      live.current.ownsEvent(event.target) &&
      !editingText(event.target);
    const copy = (event: ClipboardEvent) => {
      if (!allowed(event)) return;
      event.preventDefault();
      try {
        if (!event.clipboardData) throw new Error();
        event.clipboardData.setData("text/plain", encode());
        live.current.message(
          "Circuit copied. Boundary wires are omitted; selected wires include their endpoints.",
        );
      } catch {
        live.current.message(
          "Could not copy the circuit. Clipboard access may be blocked or the circuit is too large.",
        );
      }
    };
    const paste = (event: ClipboardEvent) => {
      if (!allowed(event)) return;
      event.preventDefault();
      try {
        insert(event.clipboardData?.getData("text/plain") ?? "");
      } catch {
        live.current.message("Could not read the circuit clipboard.");
      }
    };
    window.addEventListener("copy", copy);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("copy", copy);
      window.removeEventListener("paste", paste);
    };
  }, [encode, insert]);
  return {
    copy: async () => {
      if (!live.current.enabled) return;
      try {
        await navigator.clipboard.writeText(encode());
        live.current.message("Circuit copied.");
      } catch {
        live.current.message(
          "Could not copy the circuit. Use Cmd/Ctrl+C on the canvas, or check clipboard permissions.",
        );
      }
    },
    paste: async () => {
      const scope = live.current.scope;
      if (!live.current.enabled) return;
      try {
        const text = await navigator.clipboard.readText();
        if (live.current.enabled && live.current.scope === scope && live.current.ownsEvent(null)) insert(text);
      } catch {
        live.current.message(
          "Could not read the clipboard. Use Cmd/Ctrl+V on the canvas, or check clipboard permissions.",
        );
      }
    },
  };
}
