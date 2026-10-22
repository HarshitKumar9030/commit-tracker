import { test } from "node:test";
import assert from "node:assert/strict";
import { symbolsForFile, canMaintainIndex } from "../lib/code-index";
import { hackathonTeam } from "../lib/workflow";
const file = {
  filename: "src/app.tsx",
  status: "modified",
  additions: 3,
  deletions: 1,
};
test("diff index separates introduced, removed, and modified declarations", () => {
  const symbols = symbolsForFile({
    ...file,
    patch:
      "-export function oldHelper() {}\n+export function NewPanel() {}\n-export function changed(x) {}\n+export function changed(x,y) {}\n+export const calculate = (value) => value;\n+export interface Props {}",
  });
  assert.deepEqual(
    symbols.map((s) => [s.name, s.kind, s.change]),
    [
      ["oldHelper", "function", "removed"],
      ["NewPanel", "component", "added"],
      ["changed", "function", "modified"],
      ["calculate", "function", "added"],
      ["Props", "type", "added"],
    ],
  );
});
test("context declarations are marked touched, not introduced", () => {
  assert.equal(
    symbolsForFile({
      ...file,
      patch: "@@ -1,2 +1,3 @@ function saveBoard() {\n+return true;",
    })[0].change,
    "modified",
  );
  assert.deepEqual(symbolsForFile({ ...file, patch: undefined }), []);
});
test("four-person setup preserves owner identity and adds separate shared tablet", () => {
  const members = hackathonTeam(
    [
      {
        id: "owner",
        name: "Harshit",
        login: "HarshitKumar9030",
        role: "",
        focus: "",
        color: "purple",
      },
    ],
    "owner",
  );
  assert.deepEqual(
    members.map((m) => m.name),
    ["Harshit", "Swarnim", "Syed", "Trisha", "Canvas User"],
  );
  assert.equal(members[0].id, "owner");
  assert.equal(members.filter((m) => m.receivesReviews).length, 2);
  assert.equal(members.find((m) => m.name === "Syed")?.workstream, "index");
  assert.equal(canMaintainIndex(members[2], "owner"), true);
  assert.equal(canMaintainIndex(members[3], "owner"), false);
  assert.equal(canMaintainIndex(members[0], "owner"), true);
});
