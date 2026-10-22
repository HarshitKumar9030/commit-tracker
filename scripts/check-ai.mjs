import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
const base = "http://localhost:3000";
assert.match(
  process.env.MONGODB_URI || "",
  /^mongodb:\/\/(127\.0\.0\.1|localhost)/,
  "This test only runs against local MongoDB.",
);
let teamId;
try {
  const created = await fetch(`${base}/api/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "AI QA team",
      repo: "HarshitKumar9030/commit-tracker",
      memberName: "AI QA",
      login: "ai-qa",
      code: "temporary-ai-qa-code",
    }),
  });
  const team = await created.json();
  assert.equal(created.status, 201, JSON.stringify(team));
  teamId = team.teamId;
  const cookie = created.headers.get("set-cookie").split(";")[0];
  async function run(body) {
    const r = await fetch(`${base}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`AI HTTP ${r.status}: ${await r.text()}`);
    const reader = r.body.getReader();
    let text = "",
      chunks = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      chunks++;
    }
    return { text, chunks, cache: r.headers.get("x-ai-cache") };
  }
  const chat = await run({
    kind: "chat",
    question:
      "In two short bullets, explain what you can tell from this empty repository snapshot.",
  });
  assert.ok(chat.text.length > 10);
  assert.ok(chat.chunks > 0);
  const analytics = await run({ kind: "analytics" });
  assert.ok(analytics.text.length > 10);
  const cached = await run({ kind: "analytics" });
  assert.equal(cached.cache, "hit");
  assert.equal(cached.text, analytics.text);
  const usage = await (
    await fetch(`${base}/api/ai`, { headers: { cookie } })
  ).json();
  assert.equal(usage.requests, 2);
  assert.ok(usage.outputTokens > 0);
  console.log(
    JSON.stringify({
      provider: "direct Google Gemini 3.8 Flash",
      streamedChunks: chat.chunks,
      analytics: true,
      cacheReuse: true,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    }),
  );
} finally {
  if (teamId) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    try {
      const database = client.db(process.env.MONGODB_DB || "relay");
      for (const name of [
        "settings",
        "commits",
        "ai_cache",
        "ai_limits",
        "ai_usage",
      ]) {
        const filter =
          name === "settings"
            ? { _id: teamId }
            : name === "ai_cache" || name === "ai_limits"
              ? { _id: { $regex: `^${teamId}:` } }
              : { teamId };
        await database.collection(name).deleteMany(filter);
      }
    } finally {
      await client.close();
    }
  }
}
