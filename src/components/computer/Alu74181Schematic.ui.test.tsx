// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Alu74181Schematic } from "./Alu74181Schematic";

afterEach(cleanup);

it("highlights one region of the drawing at a time", () => {
  const { container } = render(<Alu74181Schematic />);
  expect(container.querySelectorAll("svg rect")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Carry" }));
  expect(screen.getByRole("button", { name: "Carry" }).getAttribute("aria-pressed")).toBe("true");
  expect(container.querySelectorAll("svg rect")).toHaveLength(2);
  expect(container.querySelector("img")?.getAttribute("src")).toBe(
    "/images/computer/74181-schematic.jpg",
  );
});
