import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createRadSource } from "./radSource.js";

const FILE_BYTES = 2_000_000;

const fileByteAt = (offset) => offset % 251;

const rangeResponse = (rangeHeader) => {
  const [start, end] = rangeHeader.replace("bytes=", "").split("-").map(Number);
  const lastByte = Math.min(end, FILE_BYTES - 1);
  const body = new Uint8Array(lastByte - start + 1).map((_, i) => fileByteAt(start + i));
  const half = Math.floor(body.length / 2);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(body.slice(0, half));
      controller.enqueue(body.slice(half));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 206,
    headers: { "Content-Length": String(body.length) },
  });
};

const stubRangeServer = () => {
  const server = vi.fn(async (_url, init) => rangeResponse(init.headers.Range));
  vi.stubGlobal("fetch", server);
  return server;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRadSource", () => {
  test("answers ranges inside the prefix without another request", async () => {
    const server = stubRangeServer();
    const source = createRadSource("/scene.rad");

    const bytes = await source.fetchRange(undefined, 1000, 16);

    expect(server).toHaveBeenCalledTimes(1);
    expect(Array.from(bytes)).toEqual(Array.from({ length: 16 }, (_, i) => fileByteAt(1000 + i)));
  });

  test("returns a copy so the consumer can take ownership of the buffer", async () => {
    stubRangeServer();
    const source = createRadSource("/scene.rad");

    const first = await source.fetchRange(undefined, 0, 4);
    first.fill(255);
    const second = await source.fetchRange(undefined, 0, 4);

    expect(Array.from(second)).toEqual([0, 1, 2, 3]);
  });

  test("requests ranges beyond the prefix from the server", async () => {
    const server = stubRangeServer();
    const source = createRadSource("/scene.rad");

    const bytes = await source.fetchRange(undefined, 1_600_000, 8);

    expect(server).toHaveBeenCalledTimes(2);
    expect(server.mock.calls[1][1].headers.Range).toBe("bytes=1600000-1600007");
    expect(Array.from(bytes)).toEqual(
      Array.from({ length: 8 }, (_, i) => fileByteAt(1_600_000 + i)),
    );
  });

  test("reports prefix progress up to completion", async () => {
    stubRangeServer();
    const progress = [];
    const source = createRadSource("/scene.rad", { onPrefixProgress: (p) => progress.push(p) });

    await source.prefix;

    expect(progress).toEqual([0.5, 1]);
  });

  test("serves every range from the prefix when the server ignores Range", async () => {
    const wholeFile = new Uint8Array(FILE_BYTES).map((_, i) => fileByteAt(i));
    const server = vi.fn(async () => new Response(wholeFile, { status: 200 }));
    vi.stubGlobal("fetch", server);
    const source = createRadSource("/scene.rad");

    const bytes = await source.fetchRange(undefined, 1_600_000, 8);

    expect(server).toHaveBeenCalledTimes(1);
    expect(Array.from(bytes)).toEqual(
      Array.from({ length: 8 }, (_, i) => fileByteAt(1_600_000 + i)),
    );
  });

  test("rejects a whole-file reply to a range beyond the prefix without reading it", async () => {
    const cancel = vi.fn();
    const server = vi.fn(async (_url, init) => {
      if (init.headers.Range.startsWith("bytes=0-")) return rangeResponse(init.headers.Range);
      return new Response(new ReadableStream({ cancel }), { status: 200 });
    });
    vi.stubGlobal("fetch", server);
    const source = createRadSource("/scene.rad");

    await expect(source.fetchRange(undefined, 1_600_000, 8)).rejects.toThrow("partial response");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  test("rejects the prefix when the server answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );

    await expect(createRadSource("/missing.rad").prefix).rejects.toThrow("404");
  });
});
