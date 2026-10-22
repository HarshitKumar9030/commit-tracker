import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { Realtime } from "ably";
const base = "http://localhost:3000";
assert.match(
  process.env.MONGODB_URI || "",
  /^mongodb:\/\/(127\.0\.0\.1|localhost)/,
  "Canvas QA runs only against local MongoDB.",
);
const teams = [],
  clients = [];
async function call(path, body, cookie) {
  const r = await fetch(`${base}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function create() {
  const result = await call("teams", {
    name: "Canvas QA",
    repo: "HarshitKumar9030/commit-tracker",
    memberName: "Harshit",
    login: "qa-coder",
    code: "temporary-canvas-qa-code",
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  teams.push(result.data.teamId);
  return result;
}
function eventOnce(channel, name) {
  let timer;
  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${name}`)),
      15000,
    );
    channel.subscribe(name, (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });
  return promise;
}
async function realtime(cookie) {
  const token = await call("realtime", undefined, cookie);
  assert.equal(token.status, 200);
  const client = new Realtime({
    authCallback: (_, cb) =>
      call("realtime", undefined, cookie)
        .then((r) => cb(null, r.data))
        .catch((e) => cb(e, null)),
    transports: ["web_socket"],
  });
  clients.push(client);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Realtime connection timeout")),
      15000,
    );
    client.connection.once("connected", () => {
      clearTimeout(timer);
      resolve();
    });
    client.connection.once("failed", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
  return { client, capabilities: JSON.parse(token.data.capability) };
}
try {
  const created = await create(),
    owner = created.cookie,
    teamId = created.data.teamId,
    initial = await call("state", undefined, owner),
    settings = initial.data.settings;
  const names = ["Swarnim", "Syed", "Trisha", "Canvas User"];
  const extra = names.map((name, i) => ({
    id: randomUUID(),
    name,
    login: "",
    role: [
      "Developer",
      "Code-index maintainer",
      "Presentation",
      "Shared tablet",
    ][i],
    focus: "QA",
    color: ["pink", "orange", "blue", "blue"][i],
    kind: i === 3 ? "canvas" : "member",
    ...(i < 3 ? { workstream: ["code", "index", "presentation"][i] } : {}),
    receivesReviews: i === 0,
  }));
  settings.members = [
    { ...settings.members[0], workstream: "code", receivesReviews: true },
    ...extra,
  ];
  assert.equal((await call("settings", settings, owner)).status, 200);
  const cookies = [owner];
  for (const member of extra) {
    const joined = await call("session", {
      teamId,
      id: member.id,
      code: "temporary-canvas-qa-code",
    });
    assert.equal(joined.status, 200);
    cookies.push(joined.cookie);
  }
  assert.equal((await call("canvas")).status, 401);
  assert.equal(
    (await call("canvas", undefined, cookies[2])).data.strokes.length,
    0,
  );
  const tablet = await realtime(cookies[4]),
    viewer = await realtime(cookies[3]);
  assert.deepEqual(
    viewer.capabilities[`relay-canvas-live:${teamId}`].slice().sort(),
    ["publish", "subscribe"],
  );
  assert.deepEqual(viewer.capabilities[`relay-canvas:${teamId}`], [
    "subscribe",
  ]);
  const liveChannel = viewer.client.channels.get(`relay-canvas-live:${teamId}`),
    savedChannel = viewer.client.channels.get(`relay-canvas:${teamId}`);
  const preview = eventOnce(liveChannel, "preview");
  await liveChannel.attach();
  const makeStroke = () => ({
    id: randomUUID(),
    tool: "pen",
    color: "#7554e8",
    width: 4,
    points: [
      [10, 20, 0.3],
      [100, 200, 0.9],
    ],
  });
  const first = makeStroke();
  await tablet.client.channels
    .get(`relay-canvas-live:${teamId}`)
    .publish("preview", {
      value: { kind: "ink", epoch: 0, stroke: first },
      sender: randomUUID(),
    });
  assert.equal((await preview).data.value.stroke.id, first.id);
  assert.equal((await call("canvas", undefined, owner)).data.strokes.length, 0);
  const saved = eventOnce(savedChannel, "changed");
  await savedChannel.attach();
  assert.equal(
    (
      await call(
        "canvas",
        { kind: "stroke", epoch: 0, stroke: first },
        cookies[4],
      )
    ).status,
    200,
  );
  assert.equal((await saved).data.epoch, 0);
  assert.equal(
    (
      await call(
        "canvas",
        { kind: "stroke", epoch: 0, stroke: first },
        cookies[4],
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("canvas", undefined, cookies[2])).data.strokes.length,
    1,
  );
  assert.equal(
    (await call("canvas", { kind: "stroke", epoch: 0, stroke: first }, owner))
      .status,
    409,
  );
  for (const cookie of cookies.slice(0, 4))
    assert.equal(
      (
        await call(
          "canvas",
          { kind: "stroke", epoch: 0, stroke: makeStroke() },
          cookie,
        )
      ).status,
      200,
    );
  assert.equal(
    (
      await call(
        "canvas",
        {
          kind: "stroke",
          epoch: 0,
          stroke: { ...makeStroke(), points: [[99999, 0, 0.4]] },
        },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "canvas",
        { kind: "visibility", epoch: 0, id: first.id, hidden: true },
        cookies[3],
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("canvas", undefined, owner)).data.strokes.find(
      (s) => s.id === first.id,
    ).hidden,
    true,
  );
  assert.equal(
    (
      await call(
        "canvas",
        { kind: "visibility", epoch: 0, id: first.id, hidden: false },
        cookies[3],
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("canvas", { kind: "new-board", epoch: 0 }, cookies[2])).status,
    200,
  );
  assert.equal((await call("canvas", undefined, owner)).data.strokes.length, 0);
  assert.equal(
    (await call("canvas?epoch=0", undefined, owner)).data.strokes.length,
    5,
  );
  assert.equal(
    (await call("canvas", { kind: "new-board", epoch: 0 }, cookies[4])).status,
    409,
  );
  assert.equal(
    (
      await call(
        "canvas",
        { kind: "stroke", epoch: 0, stroke: makeStroke() },
        owner,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("canvas?epoch=0", undefined, owner)).data.strokes.length,
    6,
  );
  const separate = await create();
  assert.equal(
    (await call("canvas", undefined, separate.cookie)).data.strokes.length,
    0,
  );
  const databaseClient = new MongoClient(process.env.MONGODB_URI);
  await databaseClient.connect();
  try {
    const database = databaseClient.db(process.env.MONGODB_DB || "relay"),
      sha = "f".repeat(40);
    await database.collection("commits").insertOne({
      _id: `${teamId}:${settings.repo}:main:${sha}`,
      teamId,
      repo: settings.repo,
      sha,
      title: "Add CanvasPanel",
      body: "",
      author: "qa-coder",
      branch: "main",
      date: new Date().toISOString(),
      url: "https://github.com",
      additions: 1,
      deletions: 0,
      assignee: extra[0].id,
      files: [
        {
          filename: "components/canvas.tsx",
          status: "added",
          additions: 1,
          deletions: 0,
          patch: "+export function CanvasPanel() {}",
        },
      ],
    });
    const note = {
      sha,
      summary: "Shared drawing view",
      notes: "CanvasPanel renders the team drawing surface.",
    };
    assert.equal((await call("code-index", note, cookies[3])).status, 403);
    assert.equal((await call("code-index", note, cookies[2])).status, 200);
    const state = await call("state", undefined, cookies[3]);
    assert.equal(state.data.codeIndex.length, 1);
    assert.equal(state.data.codeIndex[0].symbols[0].name, "CanvasPanel");
    assert.equal(state.data.codeIndex[0].indexedBy, extra[1].id);
    assert.equal(
      (await call("code-index", { ...note, sha: "e".repeat(40) }, cookies[2]))
        .status,
      404,
    );
    const stored = await database
      .collection("canvas_strokes")
      .findOne({ _id: `${teamId}:0:${first.id}` });
    assert.deepEqual(stored.points, first.points);
    assert.equal(stored.by, extra[3].id);
  } finally {
    await databaseClient.close();
  }
  console.log(
    JSON.stringify({
      livePreviewAcrossClients: true,
      durableBroadcast: true,
      allFourCanDraw: true,
      tabletProfile: true,
      idempotentStrokeSave: true,
      undoPersists: true,
      savedBoardHistory: true,
      offlineLateStrokePreserved: true,
      teamIsolation: true,
      indexMaintainerPermissions: true,
      indexRecordsPersist: true,
    }),
  );
} finally {
  for (const client of clients) client.close();
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  try {
    const database = c.db(process.env.MONGODB_DB || "relay");
    for (const teamId of teams) {
      for (const name of [
        "settings",
        "canvas_boards",
        "canvas_strokes",
        "commits",
        "code_index",
      ])
        await database
          .collection(name)
          .deleteMany(
            name === "settings" || name === "canvas_boards"
              ? { _id: teamId }
              : { teamId },
          );
    }
  } finally {
    await c.close();
  }
}
