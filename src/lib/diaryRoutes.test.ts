// /dev/diary and its API serve private writing: check that all of them turn
// away a production build and any other machine before they touch a file.
import fs from "node:fs";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/Layout", () => ({ default: () => null }));
vi.mock("@components/PostHeader", () => ({ default: () => null, PageMain: () => null }));

const { getServerSideProps } = await import("src/pages/dev/diary");
const { getServerSideProps: deskPage } = await import("src/pages/dev/diary/desk");
const { getServerSideProps: textPage } = await import("src/pages/dev/diary/text");
const handlers = [
  (await import("src/pages/api/dev/diary")).default,
  (await import("src/pages/api/dev/diary/marks")).default,
  (await import("src/pages/api/dev/diary/search")).default,
];

const request = (remoteAddress: string) => ({
  socket: { remoteAddress },
  headers: {},
  method: "POST",
  body: { id: "diary-entries/x.md", action: "read", words: 10 },
});

async function page(remoteAddress: string) {
  const context = {
    req: request(remoteAddress),
    query: { rel: "texts/diary-entries/x.md" },
  } as unknown as GetServerSidePropsContext;
  const results = await Promise.all(
    [getServerSideProps, deskPage, textPage].map((serve) => serve(context)),
  );
  expect(results[1]).toEqual(results[0]);
  expect(results[2]).toEqual(results[0]);
  return results[0];
}

function api(remoteAddress: string) {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const codes = handlers.map((handler) => {
    const res = { statusCode: 0, status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
    res.status.mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    });
    handler(request(remoteAddress) as unknown as NextApiRequest, res as unknown as NextApiResponse);
    return res.statusCode;
  });
  // The guards answer before any await, so none of them can reach the model.
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(new Set(codes).size).toBe(1);
  return codes[0];
}

describe("private diary routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(["production", "test"])("404 under NODE_ENV=%s without reading anything", async (env) => {
    vi.stubEnv("NODE_ENV", env);
    const read = vi.spyOn(fs, "readFileSync");
    const readdir = vi.spyOn(fs, "readdirSync");
    const write = vi.spyOn(fs, "writeFileSync");
    expect(await page("127.0.0.1")).toEqual({ notFound: true });
    expect(api("127.0.0.1")).toBe(404);
    expect(read).not.toHaveBeenCalled();
    expect(readdir).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("404 on Vercel, even under next dev", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    const readdir = vi.spyOn(fs, "readdirSync");
    expect(await page("127.0.0.1")).toEqual({ notFound: true });
    expect(api("127.0.0.1")).toBe(404);
    expect(readdir).not.toHaveBeenCalled();
  });

  it("404 for a request from another machine under next dev", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
    const readdir = vi.spyOn(fs, "readdirSync");
    const write = vi.spyOn(fs, "writeFileSync");
    expect(await page("192.168.1.20")).toEqual({ notFound: true });
    expect(api("192.168.1.20")).toBe(404);
    expect(readdir).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
