const PREFIX_BYTES = 1_500_000;

const fetchRangeBytes = async (url, { offset, bytes, signal, onProgress }) => {
  const response = await fetch(url, {
    headers: { Range: `bytes=${offset}-${offset + bytes - 1}` },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  if (offset > 0 && response.status !== 206) {
    await response.body.cancel();
    throw new Error(`Expected a partial response from ${url}, got ${response.status}`);
  }

  const total = Number(response.headers.get("Content-Length")) || bytes;
  const reader = response.body.getReader();
  const parts = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.length;
    onProgress?.(Math.min(received / total, 1));
  }

  const result = new Uint8Array(received);
  let cursor = 0;
  for (const part of parts) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
};

export const createRadSource = (url, { signal, onPrefixProgress } = {}) => {
  const prefix = fetchRangeBytes(url, {
    offset: 0,
    bytes: PREFIX_BYTES,
    signal,
    onProgress: onPrefixProgress,
  });

  const unsupportedChunkFile = async () => {
    throw new Error("A single-file .rad has no separate chunk files");
  };

  return {
    prefix,
    async fetchRange(abortSignal, offset, bytes) {
      const head = await prefix;
      if (offset + bytes <= head.length) return head.slice(offset, offset + bytes);
      return fetchRangeBytes(url, { offset, bytes, signal: abortSignal });
    },
    fetchChunkFile: unsupportedChunkFile,
    fetchChunkById: unsupportedChunkFile,
  };
};
