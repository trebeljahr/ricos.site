// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollapsibleMenuDesktop, CollapsibleMenuMobile } from "./CollapsibleMenus";

vi.mock("next/router", () => ({ useRouter: () => ({ asPath: "/" }) }));
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    href,
    children,
  }: {
    prefetch?: boolean;
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const links = [{ label: "essays", href: "/posts" }];

describe.each([
  ["desktop", CollapsibleMenuDesktop],
  ["mobile", CollapsibleMenuMobile],
])("%s menu", (_name, Menu) => {
  // next/link treats a closed menu as visible, so every page would download every menu page.
  it("prefetches its pages only once it is open", () => {
    render(<Menu links={links} text="writing" />);
    const link = screen.getByText("essays");
    expect(link.dataset.prefetch).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "writing" }));
    expect(link.dataset.prefetch).toBe("true");
  });
});
