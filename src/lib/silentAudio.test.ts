import { describe, expect, it } from "vitest";
import { audioSilenced } from "./silentAudio";

const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
const claudePane =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.1 Chrome/152.0.7977.130 Safari/537.36";

describe("audioSilenced", () => {
  it("plays sound in an ordinary browser", () => {
    expect(audioSilenced({ webdriver: false, userAgent: chrome }, "")).toBe(false);
  });

  it("silences the Claude desktop browser pane", () => {
    expect(audioSilenced({ webdriver: false, userAgent: claudePane }, "")).toBe(true);
  });

  it("silences WebDriver-driven browsers", () => {
    expect(audioSilenced({ webdriver: true, userAgent: chrome }, "")).toBe(true);
  });

  it("silences any page opened with ?mute", () => {
    expect(audioSilenced({ webdriver: false, userAgent: chrome }, "?mute")).toBe(true);
    expect(audioSilenced({ webdriver: false, userAgent: chrome }, "?a=1&mute=1")).toBe(true);
  });
});
