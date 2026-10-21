// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SemiconductorDemo } from "./SemiconductorDemo";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const choose = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

it("plays crystal substitution before ionization, pauses, and resets when the dopant changes", () => {
  vi.useFakeTimers();
  render(<SemiconductorDemo />);
  expect(screen.getByRole("img", { name: /64 lattice sites. Pure silicon/ })).toBeTruthy();
  choose("Dope the crystal");
  act(() => vi.advanceTimersByTime(1800));
  const substituted = screen.getByRole("img", { name: /1 phosphorus substitution. Dopant atoms/ });
  expect(substituted.querySelectorAll('[data-site="dopant"]')).toHaveLength(1);
  choose(/Pause animation/);
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByRole("img", { name: /Mobile carriers and fixed ions/ })).toBeNull();
  choose(/Resume animation/);
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByRole("img", { name: /Mobile carriers and fixed ions/ })).toBeTruthy();
  choose("Boron · p-type");
  expect(screen.getByRole("img", { name: /64 lattice sites. Pure silicon/ })).toBeTruthy();
  choose("More dopants");
  choose("2 Add dopant");
  expect(screen.getByRole("img", { name: /3 boron substitutions/ })).toBeTruthy();
});

it("distinguishes a donor electron, a moving acceptor hole, and a missing atom", () => {
  render(<SemiconductorDemo />);
  choose("One atom");
  choose("Phosphorus donor");
  choose("Release the donor electron");
  expect(
    screen.getByRole("img", {
      name: "Phosphorus donor in a flattened silicon bond model, ionized",
    }),
  ).toBeTruthy();
  expect(screen.getByText(/mobile electron leaves a fixed positive donor ion/)).toBeTruthy();
  choose("Boron acceptor");
  choose("Accept a bond electron");
  expect(screen.getByText(/acceptor stays negative/)).toBeTruthy();
  expect(
    screen.getByRole("img", { name: "Four electron states. Hole at position 4." }),
  ).toBeTruthy();
  choose("Fill the hole from the left");
  expect(
    screen.getByRole("img", { name: "Four electron states. Hole at position 3." }),
  ).toBeTruthy();
  choose("Missing atom");
  expect(
    screen.getByText("A vacancy is a missing atom. A hole is a missing electron."),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Accept a bond electron" })).toBeNull();
});

it("keeps carrier flow separate from conventional-current arrows across PN bias states", () => {
  render(<SemiconductorDemo />);
  choose("2 · The PN junction");
  const diagram = () => screen.getByRole("img", { name: /PN junction:/ });
  const width = () =>
    Number(diagram().querySelector('[data-region="depletion"]')?.getAttribute("width"));
  const equilibriumWidth = width();
  expect(screen.getByText(/Drift balances diffusion: net current is zero/)).toBeTruthy();
  choose("Forward bias");
  expect(
    within(diagram()).getByText("+", { selector: 'text[data-contact="p"]', exact: true }),
  ).toBeTruthy();
  expect(width()).toBeLessThan(equilibriumWidth);
  const electronFlow = diagram().querySelector('[data-flow="electron"]')?.innerHTML;
  choose("Conventional current");
  expect(diagram().querySelector('[data-flow="electron"]')?.innerHTML).toBe(electronFlow);
  choose("Reverse bias");
  expect(width()).toBeGreaterThan(equilibriumWidth);
  expect(screen.getByText(/small reverse leakage remains below breakdown/)).toBeTruthy();
  const currentLine = within(diagram())
    .getByText("small leakage · conventional current")
    .parentElement?.querySelector("line");
  expect(Number(currentLine?.getAttribute("x1"))).toBeGreaterThan(
    Number(currentLine?.getAttribute("x2")),
  );
});

it("compares injection, insulated gate control, and fin geometry", () => {
  render(<SemiconductorDemo />);
  choose("3 · Two transistor families");
  choose("Forward-bias base–emitter");
  expect(screen.getByRole("img", { name: /NPN bipolar transistor: forward active/ })).toBeTruthy();
  expect(screen.getByText(/small base current supports a much larger flow/)).toBeTruthy();
  choose("Planar nMOS");
  expect(screen.queryByRole("button", { name: "Remove forward base–emitter bias" })).toBeNull();
  choose("Raise gate relative to source");
  expect(
    screen.getByRole("img", { name: /Planar n-channel MOSFET: electron inversion channel/ }),
  ).toBeTruthy();
  expect(screen.getByText(/gate attracts electrons through an insulator/)).toBeTruthy();
  choose("Tri-gate FinFET");
  choose("Raise gate relative to source");
  expect(
    screen.getByRole("img", {
      name: /Tri-gate FinFET cross-section: gate surrounds top and both sides/,
    }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Conventional current" })).toBeNull();
  expect(screen.getByRole("link", { name: "Intel: tri-gate geometry" })).toBeTruthy();
});

it("connects periodic groups to both hosts and keeps fixed-ion and mobile-carrier signs distinct", () => {
  render(<SemiconductorDemo />);
  choose("Elements");
  choose("3 Move the charge");
  expect(
    screen.getByRole("img", { name: /Positive donor ion and mobile negative electron/ }),
  ).toBeTruthy();
  choose("Germanium");
  choose("Boron · left");
  choose("3 Move the charge");
  expect(
    screen.getByRole("img", {
      name: /Germanium has four valence electrons. Boron has three. Negative acceptor ion and mobile positive hole/,
    }),
  ).toBeTruthy();
  choose("Crystal purity");
  choose("Unwanted impurities and defects");
  expect(
    screen.getByRole("img", { name: /Some carriers scatter, become trapped, or recombine/ }),
  ).toBeTruthy();
});

it("labels the physical BC547 leads and credits reusable historic and modern photographs", () => {
  render(<SemiconductorDemo />);
  choose("4 · Real transistors");
  expect(
    screen.getByRole("img", { name: /BC547 front view.*collector, base, emitter/ }),
  ).toBeTruthy();
  choose("E · Emitter");
  expect(screen.getByText(/Supplies electrons in this NPN transistor/)).toBeTruthy();
  choose("Look inside");
  expect(screen.getByRole("img", { name: /Schematic cutaway shows a silicon die/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toBeTruthy();
  choose("1947 · point-contact design");
  expect(screen.getByRole("img", { name: /Museum display/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: "CC BY 2.0" })).toBeTruthy();
});

it("offers manual steps with reduced motion and disables automatic playback", () => {
  vi.mocked(window.matchMedia).mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  render(<SemiconductorDemo />);
  expect(
    (screen.getByRole("button", { name: "Reduced motion" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  choose("Dope the crystal");
  expect(screen.getByRole("img", { name: /Mobile carriers and fixed ions/ })).toBeTruthy();
});
