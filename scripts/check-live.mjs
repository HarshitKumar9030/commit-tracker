import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { Realtime } from "ably";
import { createHmac } from "node:crypto";
const base = process.env.APP_URL || "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))
  throw Error("Run live validation against a local development server only.");
let restoreReview;
async function request(path, body, cookie) {
  return fetch(base + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
}
async function login(id) {
  const r = await request("session", {
    id,
    code: process.env.TEAM_ACCESS_CODE,
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
async function realtime(id) {
  const cookie = await login(id);
  const token = await request("realtime", undefined, cookie).then((r) =>
    r.json(),
  );
  assert.equal(token.clientId, id);
  assert.ok(!JSON.stringify(token).includes(process.env.ABLY_API_KEY));
  return {
    cookie,
    rt: new Realtime({
      authCallback: (_, cb) => cb(null, token),
      transports: ["web_socket"],
    }),
  };
}
assert.equal((await request("sync", {})).status, 401);
const a = await realtime("harshit"),
  b = await realtime("aanya");
try {
  await Promise.all([
    a.rt.connection.once("connected"),
    b.rt.connection.once("connected"),
  ]);
  const ca = a.rt.channels.get("relay:workspace"),
    cb = b.rt.channels.get("relay:workspace");
  await ca.presence.enter({});
  await cb.presence.enter({});
  // Presence propagation across distinct WebSocket connections is asynchronous.
  const present = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Presence propagation timed out")),
      15000,
    );
    const check = async () => {
      const ms = await ca.presence.get();
      if (
        ["harshit", "aanya"].every((id) => ms.some((m) => m.clientId === id))
      ) {
        clearTimeout(timer);
        resolve(ms);
      }
    };
    ca.presence.subscribe(check);
    void check();
  });
  const update = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Workspace update timed out")),
      15000,
    );
    ca.subscribe("refresh", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  const original = await request("state", undefined, b.cookie).then((r) =>
    r.json(),
  );
  const focus = original.settings.members.find((m) => m.id === "aanya").focus;
  assert.equal((await request("focus", { focus }, b.cookie)).status, 200);
  await update;
  const first = await request("sync", {}, a.cookie).then((r) => r.json());
  assert.ok(!first.error, first.error);
  const state = await request("state", undefined, a.cookie).then((r) =>
    r.json(),
  );
  assert.ok(state.commits.length > 0);
  assert.ok(state.commits.some((c) => c.files.length > 0));
  const duplicate = await request("sync", {}, a.cookie).then((r) => r.json());
  assert.equal(duplicate.added, 0);
  const commit = state.commits.find((c) => c.assignee !== "harshit");
  assert.ok(commit);
  assert.equal(
    (
      await request(
        "review",
        { sha: commit.sha, verdict: "approved", note: "Unauthorized test" },
        a.cookie,
      )
    ).status,
    403,
  );
  restoreReview = {
    commit,
    repo: state.settings.repo,
    branch: state.settings.branch,
  };
  const reviewer = await login(commit.assignee);
  assert.equal(
    (
      await request(
        "review",
        {
          sha: commit.sha,
          verdict: "approved",
          note: "Verified the implementation and reviewed the changes.",
        },
        reviewer,
      )
    ).status,
    200,
  );
  const persisted = await request("state", undefined, a.cookie).then((r) =>
    r.json(),
  );
  assert.equal(
    persisted.commits.find((c) => c.sha === commit.sha).review.verdict,
    "approved",
  );
  const payload = JSON.stringify({
    repository: { full_name: state.settings.repo },
    ref: `refs/heads/${state.settings.branch}`,
    commits: [],
  });
  const signature =
    "sha256=" +
    createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
  const hook = await fetch(base + "/api/webhooks/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-event": "push",
      "x-hub-signature-256": signature,
    },
    body: payload,
  });
  assert.equal(hook.status, 200);
  assert.equal((await hook.json()).added, 0);
  const invalid = await fetch(base + "/api/webhooks/github", {
    method: "POST",
    headers: { "x-hub-signature-256": "invalid" },
    body: payload,
  });
  assert.equal(invalid.status, 401);
  await cb.presence.leave();
  console.log(
    JSON.stringify({
      websocketPresence: present.map((m) => m.clientId),
      liveUpdates: true,
      commits: state.commits.length,
      idempotentSync: true,
      reviewAuthorization: true,
      reviewPersisted: true,
      signedWebhook: true,
      invalidWebhookRejected: true,
    }),
  );
} finally {
  a.rt.close();
  b.rt.close();
  if (restoreReview) {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
      await client.connect();
      const { commit, repo, branch } = restoreReview;
      await client
        .db(process.env.MONGODB_DB || "relay")
        .collection("commits")
        .updateOne(
          { _id: `${repo}:${branch}:${commit.sha}` },
          commit.review
            ? { $set: { review: commit.review } }
            : { $unset: { review: "" } },
        );
    } finally {
      await client.close();
    }
  }
}
