import test from "node:test";
import assert from "node:assert/strict";
import {
  demoWorkspace,
  upgradeDemoContent,
  DEMO_CONTENT_VERSION,
} from "../lib/demo";
import { indexCommit } from "../lib/code-index";
import { presentationMarkdown, presentationOutline } from "../lib/presentation";

test("demo traces distinct diffs through maintainer notes and the presentation", () => {
  const data = demoWorkspace();
  assert.equal(new Set(data.commits.map((c) => c.files[0].patch)).size, 6);
  assert.equal(data.codeIndex?.length, 5);
  assert.equal(
    data.commits.filter((c) => !data.codeIndex?.some((r) => r.sha === c.sha))
      .length,
    1,
  );
  const symbols = data.commits.flatMap(indexCommit);
  for (const name of [
    "TeamCanvas",
    "strokeWidth",
    "indexCommit",
    "assignReviewer",
    "upsertCommit",
    "Presentation",
  ])
    assert.ok(
      symbols.some((s) => s.name === name),
      name,
    );
  for (const record of data.codeIndex!) {
    const commit = data.commits.find((c) => c.sha === record.sha)!;
    assert.deepEqual(record.symbols, indexCommit(commit));
    assert.ok(
      data.settings.members.some(
        (m) => m.id === record.indexedBy && m.workstream === "index",
      ),
    );
    assert.ok(presentationMarkdown(data).includes(record.notes));
  }
  assert.equal(presentationOutline(data).length, 3);
  assert.match(presentationMarkdown(data), /sample demo/);
});

test("demo upgrade retains identity, team edits, custom commits, notes, and reviews", () => {
  const old = demoWorkspace();
  delete old.demoContentVersion;
  old.userId = old.settings.members.find((m) => m.kind === "canvas")!.id;
  old.settings.name = "Our edited team";
  old.commits[0].review = {
    verdict: "changes",
    note: "Keep this feedback",
    by: "developer-2",
    at: "2026-10-22T12:00:00Z",
  };
  old.codeIndex![0].notes = "My handwritten code notes";
  old.commits.push({ ...old.commits[0], sha: "custom-commit" });
  const upgraded = upgradeDemoContent(old);
  assert.equal(upgraded.userId, old.userId);
  assert.deepEqual(upgraded.settings, old.settings);
  assert.equal(upgraded.commits[0].review?.note, "Keep this feedback");
  assert.ok(upgraded.commits.some((c) => c.sha === "custom-commit"));
  assert.equal(upgraded.codeIndex![0].notes, "My handwritten code notes");
  assert.equal(upgraded.demoContentVersion, DEMO_CONTENT_VERSION);
  assert.equal(upgradeDemoContent(upgraded), upgraded);
});

test("presentation empty state reports pending work without invented evidence", () => {
  const data = demoWorkspace();
  data.commits = [];
  data.codeIndex = [];
  const text = presentationMarkdown(data);
  assert.match(text, /Code index notes are still in progress/);
  assert.match(text, /0 documented changes/);
  assert.doesNotMatch(text, /Shared drawing adds/);
});

test("upgraded sample approvals match the displayed reviewer", () => {
  const old = demoWorkspace();
  delete old.demoContentVersion;
  old.commits[2].assignee = "team-lead";
  old.commits[2].review = {
    ...old.commits[2].review!,
    note: "Approved. No changes requested.",
  };
  const data = upgradeDemoContent(old);
  assert.equal(data.commits[2].assignee, data.commits[2].review!.by);
  assert.notEqual(
    data.settings.members.find((m) => m.id === data.commits[2].assignee)?.login,
    data.commits[2].author,
  );
});

test("legacy demo profiles migrate without changing identities or custom names", () => {
  const old = demoWorkspace();
  delete old.demoContentVersion;
  old.settings.members[0] = {
    ...old.settings.members[0],
    id: "harshit",
    name: "Harshit",
    login: "old-login",
  };
  old.commits = old.commits.map((c) => ({
    ...c,
    assignee: c.assignee === "team-lead" ? "harshit" : c.assignee,
    ...(c.review
      ? {
          review: {
            ...c.review,
            by: c.review.by === "team-lead" ? "harshit" : c.review.by,
          },
        }
      : {}),
  }));
  old.settings.ownerId = "harshit";
  old.userId = "harshit";
  old.settings.members[1].name = "Custom teammate";
  const updated = upgradeDemoContent(old);
  assert.equal(updated.settings.members[0].name, "Team lead");
  assert.equal(updated.settings.members[0].id, "harshit");
  assert.equal(updated.userId, "harshit");
  assert.equal(updated.settings.members[1].name, "Custom teammate");
  assert.ok(
    updated.commits.every(
      (c) =>
        !c.review ||
        updated.settings.members.some((m) => m.id === c.review!.by),
    ),
  );
});
