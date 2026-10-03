// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ViewportContextMenu } from "./ViewportContextMenu";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([
  [0, 0, 8, 8],
  [1024, 0, 756, 8],
  [0, 768, 8, 460],
  [1024, 768, 756, 460],
])("keeps a measured menu inside screen edges at %s, %s", (x, y, left, top) => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 260, height: 300 } as DOMRect);
  const { container } = render(<ViewportContextMenu x={x} y={y}>Actions</ViewportContextMenu>);
  const menu = screen.getByRole("menu");
  expect(menu.parentElement).toBe(document.body);
  expect(container.children).toHaveLength(0);
  expect(menu.style.left).toBe(`${left}px`);
  expect(menu.style.top).toBe(`${top}px`);
});

it("caps oversized menus and repositions when the viewport shrinks", () => {
  let width = 260;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width, height: 300 }) as DOMRect);
  render(<ViewportContextMenu x={1000} y={700}>Actions</ViewportContextMenu>);
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(200);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(180);
  width = 184;
  fireEvent(window, new Event("resize"));
  const menu = screen.getByRole("menu");
  expect(menu.style.maxWidth).toBe("184px");
  expect(menu.style.maxHeight).toBe("164px");
  expect(menu.style.left).toBe("8px");
  expect(menu.style.top).toBe("8px");
  expect(menu.style.overflowY).toBe("auto");
});
