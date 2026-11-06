// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DecoderDemo, MultiplexerDemo } from "./AddressRouting";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const lit = (label: string) =>
  Boolean(within(screen.getByLabelText(`${label} — LAMP part`)).queryByLabelText("LED on"));

it("decodes the address from switches on a flat board of two NOTs and four ANDs", () => {
  render(<DecoderDemo />);
  expect(screen.getAllByLabelText(/ — NOT part$/)).toHaveLength(2);
  expect(screen.getAllByLabelText(/ — AND part$/)).toHaveLength(4);
  expect(screen.queryByLabelText(/expanded circuit$/)).toBeNull();
  expect(lit("Y0")).toBe(true);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A0 — SWITCH part")));
  expect([lit("Y0"), lit("Y1"), lit("Y2"), lit("Y3")]).toEqual([false, true, false, false]);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A1 — SWITCH part")));
  expect(lit("Y3")).toBe(true);
});

it("shows a showcase circuit without the parts list, toolbar or edit tools", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "existing saved lab");
  render(<DecoderDemo />);
  expect(screen.queryByTitle(/onto canvas/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  expect(screen.queryByTitle("Edit label")).toBeNull();
  fireEvent.click(testButton("OFF", screen.getByLabelText("A0 — SWITCH part")));
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("existing saved lab");
  expect(localStorage.length).toBe(1);
});

it("routes the addressed data input to OUT through plain gates, no boxes", () => {
  render(<MultiplexerDemo />);
  expect(screen.queryByLabelText(/SELECTOR part$/)).toBeNull();
  expect(screen.getAllByLabelText(/ — (NOT|AND|OR) part$/)).toHaveLength(11);
  fireEvent.click(testButton("OFF", screen.getByLabelText("D3 — SWITCH part")));
  expect(lit("OUT")).toBe(false);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A0 — SWITCH part")));
  expect(lit("OUT")).toBe(false);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A1 — SWITCH part")));
  expect(lit("OUT")).toBe(true);
});
