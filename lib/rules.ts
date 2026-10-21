import { createHmac, timingSafeEqual } from "node:crypto";
import type { Member } from "./types";
export function assignReviewer(sha: string, author: string, members: Member[]) {
  const eligible = members.filter(
    (m) => m.login.toLowerCase() !== author.toLowerCase(),
  );
  if (!eligible.length) throw new Error("No eligible reviewer");
  return eligible[parseInt(sha.slice(0, 8), 16) % eligible.length].id;
}
export function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
