// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it } from "vitest";
import { buttonBench } from "../../lib/computer/buttonInterrupt";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";

afterEach(cleanup);
it("records a complete external press without CPU clocks, retains it until sampled, then resets transient holds", () => {
  const clock = createRef<LockedClock | null>();
  let latest: LockedView | undefined;
  render(
    <LogicBuilder
      locked={{
        circuit: buttonBench(),
        clockRef: clock,
        onFrame: (view) => {
          latest = view;
        },
      }}
    />,
  );
  act(() => {
    clock.current!.input({ raw: true });
    clock.current!.input({ raw: false });
  });
  expect(latest?.frame.clockHigh).toBe(false);
  expect(latest?.frame.snapshot.values.captured).toBe(true);
  expect(latest?.frame.snapshot.values.request).toBe(false);
  act(() => {
    clock.current!.cycle();
    clock.current!.cycle();
  });
  expect(latest?.frame.snapshot.values.request).toBe(true);
  act(() => {
    clock.current!.input({ raw: true });
    clock.current!.reset();
  });
  expect(latest?.frame.snapshot.values.raw).toBe(false);
  expect(latest?.frame.snapshot.values.captured).toBe(false);
});
