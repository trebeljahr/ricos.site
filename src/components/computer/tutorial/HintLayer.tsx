import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { HintAnchor } from "../../../lib/computer/tutorial/types";
import styles from "./Tutorial.module.css";

export type Callout = { text: string; anchor?: HintAnchor; tone: "step" | "warn" | "tip" | "good" };

type Box = { left: number; top: number; width: number; height: number };

const escapeValue = (value: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

/** The element a hint points at, inside one builder. */
function anchorElement(root: HTMLElement, anchor: HintAnchor): Element | null {
  switch (anchor.kind) {
    case "node":
      return root.querySelector(`[role="group"][data-node-id="${escapeValue(anchor.id)}"]`);
    case "input":
      return root.querySelector(
        `button[data-node-id="${escapeValue(anchor.node)}"][data-input="${anchor.index}"]`,
      );
    case "output":
      return root.querySelector(
        `button[data-node-id="${escapeValue(anchor.node)}"][data-output="${anchor.index ?? 0}"]`,
      );
    case "palette":
      return root.querySelector(`[data-palette-part="${escapeValue(anchor.part)}"]`);
    case "check":
      return root.querySelector("[data-tutorial-check]");
  }
}

/** The visible part of `element`: clipped by every scrolling ancestor up to `root`. */
function visibleBox(element: Element, root: HTMLElement): (Box & { clipped: boolean }) | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  for (
    let parent = element.parentElement;
    parent && parent !== root;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent);
    if (!/(auto|scroll|hidden)/.test(`${style.overflowX}${style.overflowY}`)) continue;
    const clip = parent.getBoundingClientRect();
    left = Math.max(left, clip.left);
    top = Math.max(top, clip.top);
    right = Math.min(right, clip.right);
    bottom = Math.min(bottom, clip.bottom);
  }
  const base = root.getBoundingClientRect();
  const clipped = right <= left || bottom <= top;
  if (clipped) {
    // Off screen in its scroll area: point at the nearest edge of the area instead.
    left = Math.min(Math.max(rect.left, left), right);
    top = Math.min(Math.max(rect.top, top), bottom);
    right = left;
    bottom = top;
  }
  return {
    left: left - base.left,
    top: top - base.top,
    width: right - left,
    height: bottom - top,
    clipped,
  };
}

const sameBox = (a: Box | null | undefined, b: Box | null | undefined) =>
  a === b ||
  Boolean(
    a &&
      b &&
      Math.abs(a.left - b.left) < 0.5 &&
      Math.abs(a.top - b.top) < 0.5 &&
      Math.abs(a.width - b.width) < 0.5 &&
      Math.abs(a.height - b.height) < 0.5,
  );

/**
 * Callouts and rings drawn over one builder, anchored to its parts, ports,
 * palette entries and check button. It measures with the DOM once per frame,
 * and only while it has something to show and the builder is on screen.
 */
export function HintLayer({ callout, rings }: { callout?: Callout; rings: readonly string[] }) {
  const layer = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<(Box & { clipped: boolean }) | null>(null);
  const [ringBoxes, setRingBoxes] = useState<Box[]>([]);
  const active = Boolean(callout || rings.length);

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = layer.current;
    const root = element?.closest<HTMLElement>("[data-logic-builder]");
    if (!element || !root || !active || !visible) {
      setTarget(null);
      setRingBoxes([]);
      return;
    }
    let frame = 0;
    let last: Box | null = null;
    let lastRings: Box[] = [];
    const measure = () => {
      const anchorTarget = callout?.anchor ? anchorElement(root, callout.anchor) : null;
      const box = anchorTarget ? visibleBox(anchorTarget, root) : null;
      if (!sameBox(box, last)) {
        last = box;
        setTarget(box);
      }
      const boxes = rings
        .map((id) => anchorElement(root, { kind: "node", id }))
        .map((item) => (item ? visibleBox(item, root) : null))
        .filter((box): box is Box & { clipped: boolean } => Boolean(box && !box.clipped));
      if (
        boxes.length !== lastRings.length ||
        boxes.some((box, index) => !sameBox(box, lastRings[index]))
      ) {
        lastRings = boxes;
        setRingBoxes(boxes);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [active, visible, callout, rings]);

  const root = layer.current?.getBoundingClientRect();
  const width = root?.width ?? 0;
  // The card sits right of its target when there is room, else left of it.
  const cardWidth = 250;
  const placeRight = target ? target.left + target.width + 16 + cardWidth < width : true;
  const cardLeft = target
    ? placeRight
      ? target.left + target.width + 14
      : Math.max(8, target.left - cardWidth - 14)
    : 0;
  const cardTop = target ? Math.max(8, target.top + target.height / 2 - 22) : 0;

  return (
    <div ref={layer} className={styles.hintLayer} aria-hidden={!callout}>
      {ringBoxes.map((box) => (
        <span
          key={`${box.left}-${box.top}-${box.width}`}
          className={styles.ring}
          style={{
            left: box.left - 6,
            top: box.top - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      ))}
      {callout && target && (
        <>
          {!target.clipped && (
            <span
              className={clsx(styles.ring, styles.targetRing, styles[callout.tone])}
              style={{
                left: target.left - 5,
                top: target.top - 5,
                width: target.width + 10,
                height: target.height + 10,
              }}
            />
          )}
          <div
            className={clsx(
              styles.callout,
              styles[callout.tone],
              !placeRight && styles.calloutLeft,
            )}
            style={{ left: cardLeft, top: cardTop, width: cardWidth }}
            role="status"
          >
            {target.clipped && <strong>Scroll the board to see it. </strong>}
            {callout.text}
          </div>
        </>
      )}
    </div>
  );
}
