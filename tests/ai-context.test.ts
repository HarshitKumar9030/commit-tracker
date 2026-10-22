import { test } from "node:test";
import assert from "node:assert/strict";
import { aiContext, boundedHistory } from "../lib/ai-context";
import { formatDiff } from "../lib/diff";
import type { Commit } from "../lib/types";
const commit: Commit = {
  sha: "a".repeat(40),
  title: "Update UI",
  body: "private body not sent",
  author: "alice",
  date: "2026-10-22",
  branch: "main",
  url: "",
  additions: 1,
  deletions: 0,
  files: [
    {
      filename: "app.ts",
      status: "modified",
      additions: 1,
      deletions: 0,
      patch: "+" + "x".repeat(30000),
    },
  ],
  assignee: "",
};
test("AI defaults to summaries, bounds diff context and excludes commit bodies", () => {
  const settings = { repo: "a/b", branch: "main", members: [] };
  const summary = aiContext(settings, [commit]);
  assert.ok(!summary.includes("private body"));
  assert.ok(!summary.includes("xxx"));
  const selected = aiContext(settings, [commit], commit.sha);
  assert.ok(selected.length <= 14000);
  assert.ok(selected.includes("selectedDiff"));
  assert.ok(!selected.includes("x".repeat(1801)));
});
test("export explicitly labels unavailable patches", () =>
  assert.match(
    formatDiff([
      { filename: "image.png", status: "added", additions: 0, deletions: 0 },
    ]),
    /Text patch unavailable/,
  ));

test("chat history never exceeds the total character budget", () => {
  const history = boundedHistory(
    Array.from({ length: 6 }, () => ({
      role: "user",
      content: "x".repeat(4000),
    })),
  );
  assert.equal(
    history.reduce((n, m) => n + m.content.length, 0),
    6000,
  );
  assert.equal(history.length, 2);
});
