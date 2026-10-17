// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecoderDemo, MemoryAddressDemo, MultiplexerDemo } from "./AddressRouting";

vi.mock("src/hooks/usePanelSound", () => ({
  usePanelSound: () => ({
    soundEnabled: false,
    toggleSound: vi.fn(),
    playSwitch: vi.fn(),
    playButton: vi.fn(),
  }),
}));
afterEach(cleanup);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const setAddress = (address: number, bits = 2) => {
  for (let bit = 0; bit < bits; bit++) {
    const button = screen.getByRole("button", { name: new RegExp(`^Input A${bit}:`) });
    if ((button.getAttribute("aria-pressed") === "true") !== Boolean(address & (1 << bit)))
      fireEvent.click(button);
  }
};

describe("address routing demos", () => {
  it("lights exactly the addressed decoder output for every row and reveals its wiring on request", () => {
    const { container } = render(<DecoderDemo />);
    expect(container.querySelector("details")?.open).toBe(false);
    const rows = within(screen.getByRole("list", { name: "Decoder truth table" })).getAllByRole(
      "button",
    );
    rows.forEach((row, address) => {
      fireEvent.click(row);
      for (let line = 0; line < 4; line++)
        expect(
          screen.getByRole("img", { name: `Output Y${line}: ${Number(line === address)}` }),
        ).toBeTruthy();
      expect(row.getAttribute("aria-current")).toBe("true");
      expect(
        screen.getByRole("button", { name: new RegExp(`^Input A1: ${address >> 1}`) }),
      ).toBeTruthy();
    });
    fireEvent.click(container.querySelector("summary")!);
    expect(container.querySelector("details")?.open).toBe(true);
    expect(screen.getByRole("img", { name: /Decoder wiring\. Address 11 lights Y3/ })).toBeTruthy();
    click(/^Input A0:/);
    expect(screen.getByRole("img", { name: /Decoder wiring\. Address 10 lights Y2/ })).toBeTruthy();
  });

  it("routes all sixteen data patterns through each of the four selections", () => {
    render(<MultiplexerDemo />);
    for (let pattern = 0; pattern < 16; pattern++) {
      for (let bit = 0; bit < 4; bit++) {
        const button = screen.getByRole("button", { name: new RegExp(`^Input D${bit}:`) });
        if ((button.getAttribute("aria-pressed") === "true") !== Boolean(pattern & (1 << bit)))
          fireEvent.click(button);
      }
      for (let address = 0; address < 4; address++) {
        setAddress(address);
        expect(
          screen.getByText(`OUT copies D${address} = ${Number(Boolean(pattern & (1 << address)))}`),
        ).toBeTruthy();
      }
    }
  });

  it("writes only the selected cell, preserves it across address changes, and clears memory", () => {
    render(<MemoryAddressDemo />);
    const memory = screen.getByRole("group", { name: "Sixteen memory cells" });
    for (let address = 0; address < 16; address++) {
      setAddress(address, 4);
      const selected = within(memory).getByRole("button", {
        name: new RegExp(`^Address ${address},`),
      });
      expect(selected.getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("img", { name: "Output READ: 0" })).toBeTruthy();
      click("WRITE");
      expect(screen.getByRole("img", { name: "Output READ: 1" })).toBeTruthy();
    }
    click(/^Input DATA:/);
    click(/^Address 6,/);
    expect(screen.getByRole("img", { name: "Output READ: 1" })).toBeTruthy();
    click("WRITE");
    for (let address = 0; address < 16; address++) {
      click(new RegExp(`^Address ${address},`));
      expect(
        screen.getByRole("img", { name: `Output READ: ${address === 6 ? 0 : 1}` }),
      ).toBeTruthy();
    }
    click("CLEAR ALL");
    expect(
      within(memory)
        .getAllByRole("button")
        .every((button) => button.textContent?.endsWith("0")),
    ).toBe(true);
  });

  it("keeps separate memory demos independent", () => {
    render(
      <>
        <MemoryAddressDemo />
        <MemoryAddressDemo />
      </>,
    );
    const demos = screen.getAllByRole("region", { name: "Row and column memory addressing" });
    fireEvent.click(within(demos[0]).getByRole("button", { name: "WRITE" }));
    expect(within(demos[0]).getByRole("img", { name: "Output READ: 1" })).toBeTruthy();
    expect(within(demos[1]).getByRole("img", { name: "Output READ: 0" })).toBeTruthy();
  });
});
