import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyCanvasOperation,
  canvasInkSchema,
  canvasCapabilities,
  compactPoints,
  type CanvasSnapshot,
  type CanvasPoint,
} from "../lib/canvas";
import { hitStroke } from "../lib/canvas-render";
import { isCodeReviewer } from "../lib/member";
const ink = {
  id: "ad9b5d2c-06a4-4b4d-91d7-d73c32d10cc5",
  tool: "pen" as const,
  color: "#7554e8" as const,
  width: 4,
  points: [
    [10, 10, 0.5],
    [100, 100, 0.9],
  ] as CanvasPoint[],
};
const empty: CanvasSnapshot = {
  epoch: 0,
  latestEpoch: 0,
  revision: 0,
  updatedAt: null,
  strokes: [],
};
test("canvas input rejects out-of-board points and oversized strokes", () => {
  assert.equal(
    canvasInkSchema.safeParse({ ...ink, points: [[1601, 0, 0.5]] }).success,
    false,
  );
  assert.equal(
    canvasInkSchema.safeParse({ ...ink, points: Array(513).fill([0, 0, 0.5]) })
      .success,
    false,
  );
});
test("optimistic canvas replay is idempotent and undo preserves stored strokes", () => {
  const operation = { kind: "stroke" as const, epoch: 0, stroke: ink };
  const once = applyCanvasOperation(empty, operation, "tablet");
  assert.equal(
    applyCanvasOperation(once, operation, "tablet").strokes.length,
    1,
  );
  const hidden = applyCanvasOperation(
    once,
    { kind: "visibility", epoch: 0, id: ink.id, hidden: true },
    "tablet",
  );
  assert.equal(hidden.strokes[0].hidden, true);
  assert.equal(once.strokes[0].hidden, false);
  assert.equal(
    applyCanvasOperation(once, { ...operation, epoch: 1 }, "tablet"),
    once,
  );
});
test("stroke compaction retains endpoints and pressure within the point budget", () => {
  const points = Array.from(
    { length: 2000 },
    (_, i) => [i % 1600, i % 1000, 0.6] as CanvasPoint,
  );
  const compact = compactPoints(points);
  assert.equal(compact.length, 512);
  assert.deepEqual(compact[0], points[0]);
  assert.deepEqual(compact.at(-1), points.at(-1));
});
test("eraser hit testing finds a segment even between sampled points", () => {
  assert.equal(
    hitStroke([55, 55, 0.5], [{ ...ink, by: "tablet", createdAt: "" }])?.id,
    ink.id,
  );
  assert.equal(
    hitStroke([500, 500, 0.5], [{ ...ink, by: "tablet", createdAt: "" }]),
    undefined,
  );
});
test("all teammates can publish previews but cannot forge durable canvas updates", () => {
  const caps = canvasCapabilities("team");
  assert.deepEqual(caps["relay-canvas-live:team"], ["subscribe", "publish"]);
  assert.deepEqual(caps["relay-canvas:team"], ["subscribe"]);
  assert.equal(Object.keys(caps).length, 3);
});
test("tablet and non-code responsibilities are never auto-assigned reviews", () => {
  assert.equal(
    isCodeReviewer({ kind: "canvas", receivesReviews: true }),
    false,
  );
  assert.equal(
    isCodeReviewer({ workstream: "index", receivesReviews: true }),
    false,
  );
  assert.equal(isCodeReviewer({ workstream: "presentation" }), false);
  assert.equal(isCodeReviewer({ workstream: "code" }), true);
});
