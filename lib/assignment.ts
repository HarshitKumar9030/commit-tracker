import type { Member } from "./types";
export function assignReviewer(sha: string, author: string, members: Member[]) {
  const eligible = members.filter(
    (m) => m.login.toLowerCase() !== author.toLowerCase(),
  );
  if (!eligible.length) throw new Error("No eligible reviewer");
  return eligible[parseInt(sha.slice(0, 8), 16) % eligible.length].id;
}
