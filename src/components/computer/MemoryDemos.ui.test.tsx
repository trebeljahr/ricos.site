// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryAddressDemo, MemoryCellDemo } from "./MemoryDemos";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const lit = (label: string) =>
  Boolean(within(screen.getByLabelText(`${label} — LAMP part`)).queryByLabelText("LED on"));
const flip = (label: string) =>
  fireEvent.click(testButton(/^(ON|OFF)$/, screen.getByLabelText(`${label} — SWITCH part`)));

it("stores a bit in the cell only while it is selected, and reads it out only on READ", () => {
  render(<MemoryCellDemo />);
  expect(screen.queryByText("Parts")).toBeNull();
  flip("WRITE");
  expect(lit("STORED")).toBe(false);
  flip("SELECT");
  expect(lit("STORED")).toBe(true);
  flip("WRITE");
  expect(lit("DATA OUT")).toBe(false);
  flip("READ");
  expect(lit("DATA OUT")).toBe(true);
});

it("stores on the clock pulse in the RAM demo and keeps saved lab circuits untouched", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "existing saved lab");
  render(<MemoryAddressDemo />);
  flip("SEND DATA IN");
  flip("WRITE");
  fireEvent.click(screen.getByRole("button", { name: "Clock pulse" }));
  expect(screen.getByLabelText("BYTE 0 BITS — BUS MERGER part").textContent).toContain("0x2A");
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("existing saved lab");
});
