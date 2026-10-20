// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_LINE, AnnounceSignup } from "./AnnounceSignup";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AnnounceSignup", () => {
  it("keeps Rico's sentence word for word", () => {
    expect(ANNOUNCE_LINE).toBe(
      "I make a new thing every month or two. Want one email when the next one is out? Nothing else.",
    );
  });

  it("renders nothing while the deployment does not offer the list", () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "live-and-learn");
    const { container } = render(<AnnounceSignup />);
    expect(container.innerHTML).toBe("");
  });

  it("is the sentence as the label of one email field, posting only the address", async () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "live-and-learn,announce");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ success: "Now check your mail to confirm your subscription!" }),
          {
            status: 200,
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AnnounceSignup />);

    const input = screen.getByLabelText(ANNOUNCE_LINE);
    expect(input.getAttribute("type")).toBe("email");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);

    fireEvent.change(input, { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("check your mail"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/announce-signup");
    expect(JSON.parse(String(init.body))).toEqual({ email: "reader@example.com", website: "" });
  });

  it("shows the server's error message and keeps the form", async () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "live-and-learn,announce");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ errorMessage: "Too many signups from here." }), {
            status: 429,
          }),
      ),
    );
    render(<AnnounceSignup />);
    fireEvent.change(screen.getByLabelText(ANNOUNCE_LINE), {
      target: { value: "reader@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Too many signups from here."),
    );
    expect(screen.getByLabelText(ANNOUNCE_LINE)).toBeTruthy();
  });

  it("checks the address before posting", () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "live-and-learn,announce");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AnnounceSignup />);
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter your email address first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
