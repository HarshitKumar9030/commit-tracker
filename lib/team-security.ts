import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(code, salt, 64).toString("hex")}`;
}
export function verifyCode(code: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex"),
    actual = scryptSync(code, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
