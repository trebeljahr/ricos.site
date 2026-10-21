// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePanelSound } from "./usePanelSound";

vi.mock("src/lib/silentAudio", () => ({ audioSilenced: () => false }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps other panels enabled by default and leaves an opt-in tutorial silent until enabled", () => {
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  gain.connect.mockReturnValue(gain);
  const tone = {
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(() => gain),
    start: vi.fn(),
    stop: vi.fn(),
    type: "sine",
  };
  const close = vi.fn();
  const audio = vi.fn(function Audio() {
    return {
      currentTime: 0,
      state: "running",
      destination: {},
      createOscillator: () => tone,
      createGain: () => gain,
      close,
    };
  });
  vi.stubGlobal("AudioContext", audio);
  const ordinary = renderHook(() => usePanelSound());
  expect(ordinary.result.current.soundEnabled).toBe(true);
  ordinary.unmount();
  const { result, unmount } = renderHook(() => usePanelSound({ defaultEnabled: false }));
  act(() => result.current.playSuccess());
  expect(audio).not.toHaveBeenCalled();
  act(() => result.current.toggleSound());
  act(() => result.current.playSuccess());
  expect(audio).toHaveBeenCalledTimes(1);
  expect(tone.start).toHaveBeenCalledTimes(3);
  unmount();
  expect(close).toHaveBeenCalledTimes(1);
});
