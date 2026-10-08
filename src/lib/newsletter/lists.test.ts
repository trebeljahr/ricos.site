import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  availableListKeys,
  isListKey,
  listIdFor,
  listNames,
  offeredListKeys,
  parseListKeys,
} from "./lists";

beforeEach(() => {
  process.env.LISTMONK_LIST_ID = "15";
  delete process.env.LISTMONK_COMPUTER_LIST_ID;
  delete process.env.NEWSLETTER_PROVIDER;
});

afterEach(() => {
  delete process.env.LISTMONK_LIST_ID;
  delete process.env.LISTMONK_COMPUTER_LIST_ID;
  delete process.env.NEWSLETTER_PROVIDER;
  vi.unstubAllEnvs();
});

describe("isListKey", () => {
  it("accepts only the keys in the registry", () => {
    expect(isListKey("live-and-learn")).toBe(true);
    expect(isListKey("computer")).toBe(true);
    for (const bad of ["", "toString", "__proto__", "15", 15, null, undefined, ["computer"]]) {
      expect(isListKey(bad), String(bad)).toBe(false);
    }
  });
});

describe("parseListKeys", () => {
  it("treats a missing field as Live and Learn, like forms before lists", () => {
    expect(parseListKeys(undefined)).toEqual(["live-and-learn"]);
  });

  it("dedupes and orders known keys", () => {
    expect(parseListKeys(["computer", "live-and-learn", "computer"])).toEqual([
      "live-and-learn",
      "computer",
    ]);
  });

  it("rejects ids, unknown keys, empty and non-array input", () => {
    for (const bad of [[], [15], ["15"], ["computer", "other"], "computer", null, {}, Array(9)]) {
      expect(parseListKeys(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("listIdFor", () => {
  it("reads each list's id from its env var", () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    expect(listIdFor("live-and-learn")).toBe(15);
    expect(listIdFor("computer")).toBe(21);
  });

  it("is null when unset or not a positive integer", () => {
    expect(listIdFor("computer")).toBeNull();
    for (const bad of ["0", "-3", "2.5", "abc"]) {
      process.env.LISTMONK_COMPUTER_LIST_ID = bad;
      expect(listIdFor("computer"), bad).toBeNull();
    }
  });
});

describe("availableListKeys", () => {
  it("hides the chapter list until its id is set", () => {
    expect(availableListKeys()).toEqual(["live-and-learn"]);
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    expect(availableListKeys()).toEqual(["live-and-learn", "computer"]);
  });

  it("offers only Live and Learn while pinned to Mailgun", () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    process.env.NEWSLETTER_PROVIDER = "mailgun";
    expect(availableListKeys()).toEqual(["live-and-learn"]);
  });
});

describe("offeredListKeys", () => {
  it("falls back to Live and Learn without the build-time value", () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "");
    expect(offeredListKeys()).toEqual(["live-and-learn"]);
  });

  it("reads the build-time value and drops unknown keys", () => {
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "live-and-learn,computer,other");
    expect(offeredListKeys()).toEqual(["live-and-learn", "computer"]);
    vi.stubEnv("NEWSLETTER_OFFERED_LISTS", "computer");
    expect(offeredListKeys()).toEqual(["live-and-learn", "computer"]);
  });
});

describe("listNames", () => {
  it("joins names for a sentence", () => {
    expect(listNames(["live-and-learn"])).toBe("Live and Learn");
    expect(listNames(["live-and-learn", "computer"])).toBe(
      "Live and Learn and How computers work: new chapters",
    );
  });
});
