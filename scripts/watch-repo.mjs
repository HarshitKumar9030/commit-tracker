// Local-only fallback when GitHub cannot reach a webhook on localhost.
const base = process.env.APP_URL || "http://localhost:3000";
if (!process.env.TEAM_ACCESS_CODE) {
  console.error("Set TEAM_ACCESS_CODE in .env.local first.");
  process.exit(1);
}
let cookie = "";
async function tick() {
  try {
    if (!cookie) {
      const login = await fetch(`${base}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "harshit",
          code: process.env.TEAM_ACCESS_CODE,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!login.ok) throw Error(`Workspace login returned ${login.status}`);
      cookie = login.headers.get("set-cookie").split(";")[0];
    }
    const response = await fetch(`${base}/api/sync`, {
      method: "POST",
      headers: { cookie },
      signal: AbortSignal.timeout(60000),
    });
    if (response.status === 401) cookie = "";
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || `Sync returned ${response.status}`);
    console.log(
      `[${new Date().toISOString()}] ${result.added} new commits synced.`,
    );
  } catch (e) {
    console.error("Repository watch:", e.message);
  }
}
await tick();
// A chained timeout prevents overlapping syncs. Public GitHub API quota is limited.
let stopped = false;
let timer;
async function loop() {
  if (stopped) return;
  await tick();
  if (!stopped) timer = setTimeout(loop, 120000);
}
timer = setTimeout(loop, 120000);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopped = true;
    clearTimeout(timer);
    process.exit(0);
  });
console.log(
  "Watching every 2 minutes. Deploy and configure a GitHub webhook for instant push updates.",
);
