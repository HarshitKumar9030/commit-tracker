import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assignReviewer, verifySignature } from "../lib/rules";
import { members } from "../lib/demo";
test("assignments exclude the author case-insensitively and stay stable for webhook redeliveries", () => {
  for (let n = 0; n < 100; n++)
    for (const author of members) {
      const sha = n.toString(16).padStart(40, "0");
      const assigned = assignReviewer(sha, author.login.toUpperCase(), members);
      assert.notEqual(assigned, author.id);
      assert.equal(assigned, assignReviewer(sha, author.login, members));
    }
});
test("unknown contributors still get one of the four teammates assigned", () => {
  assert.ok(
    members.some(
      (m) =>
        m.id ===
        assignReviewer("f".repeat(40), "external-contributor", members),
    ),
  );
});
test("webhooks authenticate raw bytes and reject altered or malformed signatures", () => {
  const raw = '{"message":"hello world"}',
    secret = "test-secret";
  const signature =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifySignature(raw, signature, secret), true);
  assert.equal(verifySignature(raw + " ", signature, secret), false);
  assert.equal(verifySignature(raw, signature, "wrong"), false);
  for (const invalid of [null, "", "sha256=abc", "sha1=" + "0".repeat(40)])
    assert.equal(verifySignature(raw, invalid, secret), false);
});
