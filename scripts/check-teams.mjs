import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
const base = "http://localhost:3000";
let teamId;
async function call(path, body, cookie) {
  const response = await fetch(`${base}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  const created = await call("teams", {
    name: "QA team",
    repo: "HarshitKumar9030/commit-tracker",
    memberName: "QA Creator",
    login: "qa-creator",
    code: "qa-test-code-only",
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  teamId = created.data.teamId;
  const ownerCookie = created.cookie;
  const state = await call("state", undefined, ownerCookie);
  assert.equal(state.data.settings.teamId, teamId);
  assert.equal(state.data.settings.members.length, 1);
  assert.equal(state.data.commits.length, 0);
  const member = {
    id: randomUUID(),
    name: "QA Member",
    login: "qa-member",
    role: "Designer",
    focus: "UI",
    color: "pink",
  };
  const settings = {
    ...state.data.settings,
    members: [...state.data.settings.members, member],
  };
  assert.equal((await call("settings", settings, ownerCookie)).status, 200);
  const found = await call("session", { teamId, code: "qa-test-code-only" });
  assert.equal(found.data.members.length, 2);
  assert.equal(
    (await call("session", { teamId, code: "wrong-code" })).status,
    401,
  );
  const joined = await call("session", {
    teamId,
    id: member.id,
    code: "qa-test-code-only",
  });
  assert.equal(joined.status, 200);
  const token = await call("realtime", undefined, joined.cookie);
  assert.deepEqual(Object.keys(JSON.parse(token.data.capability)), [
    `relay:${teamId}`,
  ]);
  assert.equal(token.data.clientId, member.id);
  assert.equal((await call("settings", settings, joined.cookie)).status, 403);
  assert.equal(
    (await call("focus", { focus: "Testing team isolation" }, joined.cookie))
      .status,
    200,
  );
  const isolated = await call("state", undefined, joined.cookie);
  assert.equal(isolated.data.settings.teamId, teamId);
  assert.equal(isolated.data.commits.length, 0);
  assert.equal(
    (
      await call(
        "settings",
        { ...settings, members: state.data.settings.members },
        ownerCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("focus", { focus: "Not allowed" }, joined.cookie)).status,
    401,
  );
  const missingOwner = await call(
    "settings",
    { ...settings, members: [member] },
    ownerCookie,
  );
  assert.equal(missingOwner.status, 400);
  console.log(
    JSON.stringify({
      groupCreated: true,
      membersAdded: true,
      groupJoin: true,
      hashedAccessCode: true,
      isolatedPresenceTokens: true,
      ownerOnlySettings: true,
      removedMemberDenied: true,
      creatorRemovalBlocked: true,
    }),
  );
} finally {
  if (teamId) {
    const c = new MongoClient(process.env.MONGODB_URI);
    await c.connect();
    const db = c.db(process.env.MONGODB_DB || "relay");
    await db.collection("settings").deleteOne({ _id: teamId });
    await db.collection("commits").deleteMany({ teamId });
    await c.close();
  }
}
