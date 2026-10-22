import { test } from "node:test";
import assert from "node:assert/strict";
import { streamingTextResponse } from "../lib/ai-stream";
test("streams Markdown incrementally and preserves Unicode", async () => {
  let enqueue: ReadableStreamDefaultController<string>;
  const stream = new ReadableStream<string>({
    start(c) {
      enqueue = c;
      c.enqueue("## Review\n");
    },
  });
  const response = await streamingTextResponse(stream),
    reader = response.body!.getReader(),
    decoder = new TextDecoder();
  assert.equal(decoder.decode((await reader.read()).value), "## Review\n");
  enqueue!.enqueue("Check `東京`");
  enqueue!.close();
  assert.equal(decoder.decode((await reader.read()).value), "Check `東京`");
  assert.equal((await reader.read()).done, true);
});
test("provider failure before output rejects before sending headers", async () => {
  const stream = new ReadableStream<string>({
    start(c) {
      c.error(new Error("Provider access denied"));
    },
  });
  await assert.rejects(streamingTextResponse(stream), /Provider access denied/);
});
test("cancel propagates to upstream generation", async () => {
  let cancelled = false;
  const stream = new ReadableStream<string>({
    start(c) {
      c.enqueue("hello");
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = await streamingTextResponse(stream);
  await response.body!.cancel();
  assert.equal(cancelled, true);
});
