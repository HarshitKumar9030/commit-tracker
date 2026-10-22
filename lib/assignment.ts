import type { Member, Settings } from "./types";
export function assignReviewer(sha: string, author: string, members: Member[], policy?: Pick<Settings, "assignmentMode" | "defaultReviewerId" | "allowSelfReview">) {
  if (policy?.assignmentMode === "manual") return "";
  const eligible = members.filter(m => m.receivesReviews !== false && (policy?.allowSelfReview || m.login.toLowerCase() !== author.toLowerCase()));
  if (!eligible.length) { if (policy) return ""; throw new Error("No eligible reviewer"); }
  if (policy?.defaultReviewerId) return eligible.find(m => m.id === policy.defaultReviewerId)?.id || "";
  return eligible[parseInt(sha.slice(0, 8), 16) % eligible.length].id;
}
