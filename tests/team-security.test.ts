import { test } from "node:test";
import assert from "node:assert/strict";
import { hashCode, verifyCode } from "../lib/team-security";
test("team codes use unique salted hashes and reject incorrect codes", () => {
  const first = hashCode("hackathon-code"),
    second = hashCode("hackathon-code");
  assert.notEqual(first, second);
  assert.ok(!first.includes("hackathon-code"));
  assert.equal(verifyCode("hackathon-code", first), true);
  assert.equal(verifyCode("wrong-code", first), false);
  assert.equal(verifyCode("hackathon-code", "bad-hash"), false);
});
