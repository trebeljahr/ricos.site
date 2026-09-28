import { beforeEach, describe, expect, it, vi } from "vitest";

const { activateEmailListMember } = vi.hoisted(() => ({
  activateEmailListMember: vi.fn(async (_email: string) => {}),
}));
vi.mock("./mailgun", () => ({ activateEmailListMember }));

import { checkHash, confirmEmail, getHash } from "./emailUtils";

process.env.SALT = "test-salt";

beforeEach(() => {
  activateEmailListMember.mockClear();
});

describe("checkHash", () => {
  it("accepts the hash getHash put into the confirm link", async () => {
    const hash = await getHash("reader@example.com");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    await expect(checkHash("reader@example.com", hash)).resolves.toBe(true);
  });

  it("rejects a hash made for another address", async () => {
    const hash = await getHash("someone-else@example.com");
    await expect(checkHash("reader@example.com", hash)).resolves.toBe(false);
  });

  it("rejects hashes of the wrong shape", async () => {
    const hash = await getHash("reader@example.com");
    for (const bad of [
      "",
      "anything",
      hash.slice(0, 62),
      `${hash}00`,
      `${hash}zz`,
      "0".repeat(128),
    ]) {
      await expect(checkHash("reader@example.com", bad), bad).resolves.toBe(false);
    }
  });
});

describe("confirmEmail", () => {
  it("does not confirm an address with a made-up hash", async () => {
    await expect(confirmEmail("victim@example.com", "anything")).resolves.toBe(false);
    await expect(confirmEmail("victim@example.com", "0".repeat(64))).resolves.toBe(false);
    await expect(confirmEmail("victim@example.com", undefined)).resolves.toBe(false);
    await expect(confirmEmail(["victim@example.com"], "0".repeat(64))).resolves.toBe(false);
    expect(activateEmailListMember).not.toHaveBeenCalled();
  });

  it("confirms an address with its genuine hash", async () => {
    const hash = await getHash("reader@example.com");
    await expect(confirmEmail("reader@example.com", hash)).resolves.toBe(true);
    expect(activateEmailListMember).toHaveBeenCalledWith("reader@example.com");
  });

  it("reads a plus address from an old unencoded link", async () => {
    const hash = await getHash("reader+news@example.com");
    // `?email=reader+news@example.com` parses to "reader news@example.com".
    await expect(confirmEmail("reader news@example.com", hash)).resolves.toBe(true);
    expect(activateEmailListMember).toHaveBeenCalledWith("reader+news@example.com");
  });
});
