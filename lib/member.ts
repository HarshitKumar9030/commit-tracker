export function isCodeReviewer(member: {
  kind?: string;
  receivesReviews?: boolean;
  workstream?: string;
}) {
  return (
    member.kind !== "canvas" &&
    (!member.workstream || member.workstream === "code") &&
    member.receivesReviews !== false
  );
}
