/** Read once before committing headers, so authentication failures remain HTTP errors. */
export async function streamingTextResponse(stream: ReadableStream<string>) {
  const reader = stream.getReader(),
    first = await reader.read(),
    encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        if (first.done) controller.close();
        else controller.enqueue(encoder.encode(first.value));
      },
      async pull(controller) {
        const next = await reader.read();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      },
      cancel() {
        return reader.cancel();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Cache": "miss",
        "Cache-Control": "no-store",
      },
    },
  );
}
