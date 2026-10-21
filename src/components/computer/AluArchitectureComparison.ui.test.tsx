// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AluArchitectureComparison } from "./AluArchitectureComparison";

afterEach(cleanup);

it("maps schematic regions without pretending that the annotations simulate a 74181", () => {
  const { container } = render(<AluArchitectureComparison />);
  expect(container.querySelectorAll("svg rect")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Carry network" }));
  expect(screen.getByRole("button", { name: "Carry network" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(container.querySelectorAll("svg rect")).toHaveLength(2);
  expect(screen.getByText(/Cn supplies carry in/)).toBeTruthy();
  expect(container.querySelector("img")?.getAttribute("src")).toBe(
    "/images/computer/74181-schematic.jpg",
  );
  expect(container.textContent).toContain("M high selects logic; M low enables arithmetic carries");
  expect(container.textContent).toContain("A=B is not an unconditional equality flag");
  expect(container.textContent).toContain("They do not report zero, sign or signed overflow");
  expect(screen.getByText("Texas Instruments 181-family datasheet").getAttribute("href")).toContain(
    "ti.com",
  );
  expect(container.querySelector("[data-logic-builder]")).toBeNull();
});
