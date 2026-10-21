// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SemiconductorDemo } from "./SemiconductorDemo";

afterEach(cleanup);

const choose = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

it("distinguishes an ionized donor, an acceptor hole, and an absent atom", () => {
  render(<SemiconductorDemo />);
  choose("Phosphorus donor");
  choose("Release the donor electron");
  expect(
    screen.getByRole("img", {
      name: "Phosphorus donor in a flattened silicon bond model, ionized",
    }),
  ).toBeTruthy();
  expect(screen.getByText(/n-type: an ionized donor stays positive/)).toBeTruthy();
  choose("Boron acceptor");
  choose("Accept a bond electron");
  expect(screen.getByText(/p-type: the acceptor stays negative/)).toBeTruthy();
  expect(
    screen.getByRole("img", { name: "Four electron states. Hole at position 4." }),
  ).toBeTruthy();
  choose("Fill the hole from the left");
  expect(
    screen.getByRole("img", { name: "Four electron states. Hole at position 3." }),
  ).toBeTruthy();
  choose("Missing atom");
  expect(
    screen.getByText(
      "A vacancy is an absent atom. A hole is an absent electron state, not an empty atom site.",
    ),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Accept a bond electron" })).toBeNull();
});

it("changes PN-junction polarity and depletion width without treating reverse current as zero", () => {
  render(<SemiconductorDemo />);
  choose("2 · The PN junction");
  const equilibrium = screen.getByRole("img", {
    name: "PN junction: no applied bias. Equilibrium width.",
  });
  const width = (diagram: HTMLElement) =>
    Number(diagram.querySelector('[data-region="depletion"]')?.getAttribute("width"));
  const equilibriumWidth = width(equilibrium);
  expect(screen.getByText(/opposing currents give zero net current at equilibrium/)).toBeTruthy();
  choose("Forward bias");
  const forward = screen.getByRole("img", {
    name: "PN junction: forward bias. Narrower depletion region.",
  });
  expect(
    within(forward).getByText("+", { selector: 'text[data-contact="p"]', exact: true }),
  ).toBeTruthy();
  expect(width(forward)).toBeLessThan(equilibriumWidth);
  expect(screen.getByText(/Make p positive relative to n/)).toBeTruthy();
  choose("Reverse bias");
  const reverse = screen.getByRole("img", {
    name: "PN junction: reverse bias. Wider depletion region.",
  });
  expect(width(reverse)).toBeGreaterThan(equilibriumWidth);
  expect(screen.getByText(/small reverse leakage remains below breakdown/)).toBeTruthy();
  choose("Conventional current");
  expect(screen.getByText("small leakage · conventional current")).toBeTruthy();
  const currentLine = within(reverse)
    .getByText("small leakage · conventional current")
    .parentElement?.querySelector("line");
  expect(Number(currentLine?.getAttribute("x1"))).toBeGreaterThan(
    Number(currentLine?.getAttribute("x2")),
  );
});

it("keeps NPN base injection distinct from insulated gate control and fin geometry", () => {
  render(<SemiconductorDemo />);
  choose("3 · Two transistor families");
  choose("Forward-bias base–emitter");
  expect(screen.getByRole("img", { name: /NPN bipolar transistor: forward active/ })).toBeTruthy();
  expect(
    screen.getByText(/diffuse across the thin base, and are swept into the collector/),
  ).toBeTruthy();
  choose("Conventional current");
  expect(screen.getByText(/Conventional collector current: collector → emitter/)).toBeTruthy();
  choose("Planar nMOS");
  expect(screen.queryByRole("button", { name: "Remove forward base–emitter bias" })).toBeNull();
  choose("Raise gate relative to source");
  expect(
    screen.getByRole("img", { name: /Planar n-channel MOSFET: electron inversion channel/ }),
  ).toBeTruthy();
  expect(screen.getByText(/dielectric separates gate charge from channel charge/)).toBeTruthy();
  expect(
    screen.getByText(/Charging or discharging the gate requires transient current/),
  ).toBeTruthy();
  choose("Tri-gate FinFET");
  choose("Raise gate relative to source");
  expect(
    screen.getByRole("img", {
      name: /Tri-gate FinFET cross-section: gate surrounds top and both sides/,
    }),
  ).toBeTruthy();
  expect(screen.getByRole("link", { name: "Intel: tri-gate geometry" })).toBeTruthy();
});
