// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpectrumThumbnail } from "./SpectrumThumbnail";

const props = {
  id: "photo-1",
  src: "/photo/256.webp",
  srcSet: "/photo/256.webp 256w, /photo/640.webp 640w",
  sizes: "300px",
  width: 300,
  enabled: true,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("spectrum thumbnails", () => {
  it("defers new tiles while hurrying, then keeps their slow downloads alive", () => {
    const onLoad = vi.fn();
    const { container, rerender } = render(
      <SpectrumThumbnail {...props} enabled={false} onLoad={onLoad} />,
    );
    expect(container.querySelector("img")).toBeNull();
    rerender(<SpectrumThumbnail {...props} onLoad={onLoad} />);
    const image = container.querySelector("img")!;
    rerender(<SpectrumThumbnail {...props} enabled={false} onLoad={onLoad} />);
    act(() => vi.advanceTimersByTime(60000));
    expect(container.querySelector("img")).toBe(image);
    expect(image.getAttribute("srcset")).toBe(props.srcSet);
    fireEvent.load(image);
    expect(onLoad).toHaveBeenCalledWith(props.id);
  });

  it("retries a failed responsive image using only the small fallback", () => {
    const onLoad = vi.fn();
    const { container } = render(<SpectrumThumbnail {...props} onLoad={onLoad} />);
    const original = container.querySelector("img")!;
    fireEvent.error(original);
    expect(original.hasAttribute("data-broken")).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    const retry = container.querySelector("img")!;
    expect(retry).not.toBe(original);
    expect(retry.getAttribute("src")).toBe(props.src);
    expect(retry.hasAttribute("srcset")).toBe(false);
    fireEvent.load(retry);
    expect(retry.hasAttribute("data-broken")).toBe(false);
    expect(onLoad).toHaveBeenCalledWith(props.id);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reveals a later successful load and cancels its pending retry", () => {
    const { container } = render(<SpectrumThumbnail {...props} onLoad={vi.fn()} />);
    const image = container.querySelector("img")!;
    fireEvent.error(image);
    fireEvent.load(image);
    expect(image.hasAttribute("data-broken")).toBe(false);
    act(() => vi.advanceTimersByTime(60000));
    expect(container.querySelector("img")).toBe(image);
  });

  it("recognizes images that loaded before event handlers attached", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(256);
    const onLoad = vi.fn();
    render(<SpectrumThumbnail {...props} onLoad={onLoad} />);
    expect(onLoad).toHaveBeenCalledWith(props.id);
  });

  it("recovers images that failed before event handlers attached", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const { container } = render(<SpectrumThumbnail {...props} onLoad={vi.fn()} />);
    const original = container.querySelector("img")!;
    expect(original.hasAttribute("data-broken")).toBe(true);
    complete.mockReturnValue(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("img")).not.toBe(original);
  });

  it("bounds persistent failures and recovers when the connection returns", () => {
    const onLoad = vi.fn();
    const { container } = render(<SpectrumThumbnail {...props} onLoad={onLoad} />);
    for (const delay of [1000, 3000, 8000]) {
      const image = container.querySelector("img")!;
      fireEvent.error(image);
      act(() => vi.advanceTimersByTime(delay));
      expect(container.querySelector("img")).not.toBe(image);
    }
    const exhausted = container.querySelector("img")!;
    fireEvent.error(exhausted);
    act(() => vi.advanceTimersByTime(60000));
    expect(container.querySelector("img")).toBe(exhausted);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.online(window);
    const recovered = container.querySelector("img")!;
    expect(recovered).not.toBe(exhausted);
    fireEvent.load(recovered);
    expect(recovered.hasAttribute("data-broken")).toBe(false);
    expect(onLoad).toHaveBeenCalledWith(props.id);
  });

  it("cancels recovery work when a tile leaves the rendered rows", () => {
    const onLoad = vi.fn();
    const { container, unmount } = render(<SpectrumThumbnail {...props} onLoad={onLoad} />);
    fireEvent.error(container.querySelector("img")!);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.online(window);
    act(() => vi.advanceTimersByTime(60000));
    expect(onLoad).not.toHaveBeenCalled();
  });
});
