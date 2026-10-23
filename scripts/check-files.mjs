import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
const teamIds = [];
async function call(path, body, cookie) {
  const response = await fetch(`http://localhost:3000/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function create() {
  const result = await call("teams", {
    name: "Files QA",
    repo: "HarshitKumar9030/commit-tracker",
    memberName: "QA Owner",
    login: "qa-owner",
    code: "files-test-only",
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  teamIds.push(result.data.teamId);
  return result;
}
try {
  assert.equal((await call("files", { action: "add" })).status, 401);
  const owner = await create(),
    second = await create();
  const initial = await call("state", undefined, owner.cookie);
  const member = {
    id: randomUUID(),
    name: "QA Presenter",
    login: "",
    role: "Presentation",
    workstream: "presentation",
    focus: "Slides",
    color: "pink",
    receivesReviews: false,
  };
  const settings = {
    ...initial.data.settings,
    members: [...initial.data.settings.members, member],
  };
  assert.equal((await call("settings", settings, owner.cookie)).status, 200);
  const joined = await call("session", {
    teamId: owner.data.teamId,
    id: member.id,
    code: "files-test-only",
  });
  const input = {
    action: "add",
    url: "https://drive.google.com/file/d/qaDrivePdf123/view?resourcekey=testResource123",
    title: "Team brief.pdf",
    description: "## Purpose\nReference for the pitch.",
    category: "presentation",
  };
  assert.equal((await call("files", input, joined.cookie)).status, 200);
  assert.equal((await call("files", input, joined.cookie)).status, 409);
  const state = await call("state", undefined, owner.cookie),
    file = state.data.files[0];
  assert.equal(file.addedBy, member.id);
  assert.match(file.previewUrl, /resourcekey=testResource123/);
  assert.equal(file.description, input.description);
  assert.equal(
    (await call("state", undefined, second.cookie)).data.files.length,
    0,
  );
  assert.equal(
    (await call("files", { action: "archive", id: file.id }, second.cookie))
      .status,
    404,
  );
  const ownedInput = {
    ...input,
    url: "https://docs.google.com/document/d/qaDocument123/edit",
    title: "Owner notes",
  };
  assert.equal((await call("files", ownedInput, owner.cookie)).status, 200);
  assert.equal(
    (
      await call(
        "files",
        { action: "archive", id: "qaDocument123" },
        joined.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "files",
        {
          action: "update",
          id: file.id,
          title: "Final brief.pdf",
          description: "**Approved** for the demo.",
          category: "reference",
          pinned: true,
        },
        joined.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("files", { action: "archive", id: file.id }, owner.cookie))
      .status,
    200,
  );
  assert.ok(
    (await call("state", undefined, owner.cookie)).data.files.find(
      (f) => f.id === file.id,
    ).archivedAt,
  );
  assert.equal(
    (await call("files", { action: "restore", id: file.id }, joined.cookie))
      .status,
    200,
  );
  const restored = (
    await call("state", undefined, owner.cookie)
  ).data.files.find((f) => f.id === file.id);
  assert.equal(restored.archivedAt, undefined);
  assert.equal(restored.pinned, true);
  assert.equal(restored.title, "Final brief.pdf");
  assert.equal(
    (
      await call(
        "files",
        { ...input, url: "https://evil.test/file.pdf" },
        owner.cookie,
      )
    ).status,
    400,
  );
  console.log(
    JSON.stringify({
      sharedAcrossMembers: true,
      persistedMarkdown: true,
      deduplicated: true,
      teamIsolation: true,
      ownershipEnforced: true,
      archivedAndRestored: true,
      driveResourceKeysPreserved: true,
    }),
  );
} finally {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const database = client.db(process.env.MONGODB_DB || "relay");
    for (const teamId of teamIds) {
      await database.collection("team_files").deleteMany({ teamId });
      await database.collection("settings").deleteOne({ _id: teamId });
    }
  } finally {
    await client.close();
  }
}
