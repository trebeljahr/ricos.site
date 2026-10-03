import { useCallback, useEffect, useRef, useState } from "react";
import type { Wire } from "../lib/computer/logic";
import {
  distanceToSegment,
  type PortConnection,
  type PortPoint,
  type PortRef,
  planPortConnections,
  portKey,
  type WiringPort,
} from "../lib/computer/portWiring";

type Gesture = {
  mode: "select" | "wire";
  pointerId: number;
  start: PortPoint;
  last: PortPoint;
  base: string[];
  anchor: string;
  moved: boolean;
};
type State = {
  keys: string[];
  gesture: Gesture | null;
  point: PortPoint | null;
  target: string | null;
};
const empty = (): State => ({ keys: [], gesture: null, point: null, target: null });
type Options = {
  ports: WiringPort[];
  wires: Wire[];
  zoom: number;
  toPoint: (clientX: number, clientY: number) => PortPoint;
  onStart: () => void;
  onConnect: (connections: PortConnection[]) => void;
  onMessage: (message: string) => void;
};

/** Shared by the main canvas and each editable circuit scope. */
export function usePortWiring(options: Options) {
  const live = useRef(options);
  live.current = options;
  const [state, setState] = useState<State>(empty);
  const current = useRef(state);
  const suppressClick = useRef(false);
  const update = useCallback((next: State) => {
    current.current = next;
    setState(next);
  }, []);
  const clear = useCallback(() => update(empty()), [update]);
  const selection = () =>
    live.current.ports.filter((port) => current.current.keys.includes(portKey(port)));
  const nearest = (point: PortPoint, kind: WiringPort["kind"]) => {
    let closest: WiringPort | null = null,
      distance = 30 / live.current.zoom;
    for (const port of live.current.ports) {
      if (port.kind === kind) continue;
      const next = Math.hypot(point.x - port.x, point.y - port.y);
      if (next < distance) {
        closest = port;
        distance = next;
      }
    }
    return closest;
  };
  const describe = (target: WiringPort) => {
    const plan = planPortConnections(selection(), target, live.current.ports, live.current.wires);
    const first = plan.connections[0],
      last = plan.connections.at(-1);
    const label = (wire: PortConnection) =>
      `${
        live.current.ports.find(
          (port) =>
            port.nodeId === wire.from && port.kind === "output" && port.index === wire.output,
        )?.label
      } → ${
        live.current.ports.find(
          (port) => port.nodeId === wire.to && port.kind === "input" && port.index === wire.input,
        )?.label
      }`;
    live.current.onMessage(
      plan.error ||
        `Release to connect ${plan.connections.length} wires: ${first ? label(first) : ""}${last && last !== first ? ` … ${label(last)}` : ""}.`,
    );
    return plan;
  };
  const connectTo = (target: WiringPort) => {
    const plan = describe(target);
    if (plan.error) return false;
    if (plan.additions.length) live.current.onConnect(plan.additions);
    clear();
    live.current.onMessage(
      plan.additions.length
        ? `Connected ${plan.additions.length} wires. Undo removes this batch.`
        : "Those ports are already connected.",
    );
    return true;
  };
  const selectedMessage = () =>
    live.current.onMessage(
      current.current.keys.length
        ? `${current.current.keys.length} ports selected. Drag any selected port to connect. Shift-click toggles ports; Esc clears selection.`
        : "Port selection cleared.",
    );
  const toggle = (port: WiringPort) => {
    const base = selection()[0]?.kind === port.kind ? current.current.keys : [];
    const key = portKey(port);
    update({
      ...empty(),
      keys: base.includes(key) ? base.filter((item) => item !== key) : [...base, key],
    });
    selectedMessage();
  };
  const pointerDown = (event: React.PointerEvent<HTMLButtonElement>, ref: PortRef) => {
    if (event.button !== 0 || event.pointerType === "touch") return false;
    const port = live.current.ports.find((item) => portKey(item) === portKey(ref));
    if (!port) return false;
    const selected = selection(),
      key = portKey(port);
    if (!event.shiftKey && !current.current.keys.includes(key) && selected[0]?.kind === port.kind) {
      clear();
      return false;
    }
    if (!event.shiftKey && !selected.length) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.closest("[data-port-surface]")?.setPointerCapture(event.pointerId);
    suppressClick.current = true;
    live.current.onStart();
    const base = selected[0]?.kind === port.kind ? [...current.current.keys] : [];
    if (event.shiftKey) toggle(port);
    const point = live.current.toPoint(event.clientX, event.clientY);
    update({
      ...current.current,
      point,
      target: null,
      gesture: {
        mode: event.shiftKey ? "select" : "wire",
        pointerId: event.pointerId,
        start: point,
        last: point,
        base,
        anchor: key,
        moved: false,
      },
    });
    return true;
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = current.current.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    event.stopPropagation();
    const point = live.current.toPoint(event.clientX, event.clientY);
    const moved =
      gesture.moved ||
      Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) * live.current.zoom > 3;
    if (gesture.mode === "select") {
      const anchor = live.current.ports.find((port) => portKey(port) === gesture.anchor);
      const hits =
        moved && anchor
          ? live.current.ports
              .filter(
                (port) =>
                  port.kind === anchor.kind &&
                  distanceToSegment(port, gesture.last, point) * live.current.zoom <= 12,
              )
              .map(portKey)
          : [];
      update({
        ...current.current,
        point,
        keys: moved
          ? [...new Set([...current.current.keys, ...gesture.base, gesture.anchor, ...hits])]
          : current.current.keys,
        gesture: { ...gesture, moved, last: point },
      });
      selectedMessage();
    } else {
      const selected = selection();
      const target = selected[0] ? nearest(point, selected[0].kind) : null;
      update({
        ...current.current,
        point,
        target: target ? portKey(target) : null,
        gesture: { ...gesture, moved, last: point },
      });
      if (target) describe(target);
      else
        live.current.onMessage(
          `Dragging ${selected.length} wires. Drop on the opposite port bank; Esc cancels.`,
        );
    }
    return true;
  };
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = current.current.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    event.stopPropagation();
    if (gesture.mode === "wire") {
      const selected = selection();
      const target = selected[0]
        ? nearest(live.current.toPoint(event.clientX, event.clientY), selected[0].kind)
        : null;
      if (target && connectTo(target)) return true;
      if (!target) selectedMessage();
    } else selectedMessage();
    update({ ...current.current, gesture: null, point: null, target: null });
    return true;
  };
  const click = (event: React.MouseEvent<HTMLButtonElement>, ref: PortRef) => {
    // Real pointer gestures are completed on pointer-up; keyboard activation has detail zero.
    if (event.detail !== 0) {
      const handled = suppressClick.current;
      suppressClick.current = false;
      return handled;
    }
    const port = live.current.ports.find((item) => portKey(item) === portKey(ref));
    if (!port) return false;
    if (event.shiftKey) {
      event.stopPropagation();
      live.current.onStart();
      toggle(port);
      return true;
    }
    if (selection().length && selection()[0].kind !== port.kind) {
      event.stopPropagation();
      connectTo(port);
      return true;
    }
    if (current.current.keys.includes(portKey(port))) return true;
    clear();
    return false;
  };
  const consumeClick = () => {
    const handled = suppressClick.current;
    suppressClick.current = false;
    return handled;
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && current.current.keys.length) {
        update(empty());
        live.current.onMessage("Port selection cleared.");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [update]);
  useEffect(() => {
    const keys = new Set(options.ports.map(portKey));
    if (current.current.keys.some((key) => !keys.has(key))) update(empty());
  }, [options.ports, update]);
  const selected = options.ports.filter((port) => state.keys.includes(portKey(port)));
  const target = options.ports.find((port) => portKey(port) === state.target);
  const plan = target ? planPortConnections(selected, target, options.ports, options.wires) : null;
  const previews: { from: PortPoint; to: PortPoint }[] = [];
  if (state.gesture?.mode === "wire") {
    if (plan?.connections.length)
      for (const connection of plan.connections) {
        const from = options.ports.find(
          (port) =>
            port.nodeId === connection.from &&
            port.kind === "output" &&
            port.index === connection.output,
        );
        const to = options.ports.find(
          (port) =>
            port.nodeId === connection.to &&
            port.kind === "input" &&
            port.index === connection.input,
        );
        if (from && to) previews.push({ from, to });
      }
    else if (state.point)
      selected.forEach((port, index) => {
        const end = {
          x: state.point!.x,
          y: state.point!.y + ((index - (selected.length - 1) / 2) * 8) / options.zoom,
        };
        previews.push(port.kind === "output" ? { from: port, to: end } : { from: end, to: port });
      });
  }
  return {
    selected,
    previews,
    invalid: Boolean(plan?.error),
    clear,
    pointerDown,
    pointerMove,
    pointerUp,
    click,
    consumeClick,
    active: Boolean(state.gesture),
    isSelected: (port: PortRef) => state.keys.includes(portKey(port)),
    isTarget: (port: PortRef) =>
      Boolean(
        plan?.connections.some((wire) =>
          port.kind === "input"
            ? wire.to === port.nodeId && wire.input === port.index
            : wire.from === port.nodeId && wire.output === port.index,
        ),
      ),
  };
}
