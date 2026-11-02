import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clientAddresses, readEntries, servesPrivateNotes } from "./diaryStore";

const dev = { NODE_ENV: "development" };

describe("servesPrivateNotes", () => {
  it("serves only `next dev` on this machine", () => {
    expect(servesPrivateNotes(dev, ["127.0.0.1"])).toBe(true);
    expect(servesPrivateNotes(dev, ["::1"])).toBe(true);
    expect(servesPrivateNotes(dev, ["::ffff:127.0.0.1"])).toBe(true);
  });

  it("never serves a production build, a test run or Vercel", () => {
    expect(servesPrivateNotes({ NODE_ENV: "production" }, ["127.0.0.1"])).toBe(false);
    expect(servesPrivateNotes({ NODE_ENV: "test" }, ["127.0.0.1"])).toBe(false);
    expect(servesPrivateNotes({}, ["127.0.0.1"])).toBe(false);
    expect(servesPrivateNotes({ ...dev, VERCEL: "1" }, ["127.0.0.1"])).toBe(false);
  });

  it("never serves another machine, even one that claims to be localhost", () => {
    expect(servesPrivateNotes(dev, ["192.168.1.20"])).toBe(false);
    expect(servesPrivateNotes(dev, ["192.168.1.20", "127.0.0.1"])).toBe(false);
    expect(servesPrivateNotes(dev, ["127.0.0.1", "192.168.1.20"])).toBe(false);
    expect(servesPrivateNotes(dev, [""])).toBe(false);
    expect(servesPrivateNotes(dev, [])).toBe(false);
  });
});

describe("clientAddresses", () => {
  it("lists the socket and every forwarded address", () => {
    const req = {
      socket: { remoteAddress: "::1" },
      headers: { "x-forwarded-for": "127.0.0.1, 10.0.0.5" },
    } as unknown as Parameters<typeof clientAddresses>[0];
    expect(clientAddresses(req)).toEqual(["::1", "127.0.0.1", "10.0.0.5"]);
  });
});

describe("readEntries", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("reads only the folders that count", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "diary-"));
    const write = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(dir as string, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir as string, rel), text);
    };
    const body = Array.from({ length: 60 }, () => "word").join(" ");
    write("diary-entries/2019-11-02-example.md", `---\ntitle: Talks\n---\n${body}`);
    write("misc/some-note.md", body);
    write("notion/Workspace/Todo Lists/List.md", body);
    const read = vi.spyOn(fs, "readFileSync");
    const entries = readEntries(dir);
    expect(entries.map((e) => [e.rel, e.title, e.date])).toEqual([
      ["diary-entries/2019-11-02-example.md", "Talks", "2019-11-02"],
    ]);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
