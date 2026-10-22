import type { Commit, Settings } from "./types";
export function aiContext(
  settings: Settings,
  commits: Commit[],
  selectedSha?: string,
) {
  const recent = commits.slice(0, 20);
  return JSON.stringify({
    repo: settings.repo,
    branch: settings.branch,
    members: settings.members.map((m) => ({
      name: m.name,
      role: m.role,
      codeReviews: m.receivesReviews !== false,
    })),
    summary: {
      loaded: commits.length,
      pending: commits.filter((c) => !c.review).length,
      unassigned: commits.filter((c) => !c.review && !c.assignee).length,
    },
    commits: recent.map((c) => ({
      sha: c.sha.slice(0, 7),
      title: c.title.slice(0, 160),
      author: c.author,
      reviewer:
        settings.members.find((m) => m.id === c.assignee)?.name || "Unassigned",
      review: c.review?.verdict,
      files: c.files.slice(0, 8).map((f) => f.filename),
      added: c.additions,
      removed: c.deletions,
    })),
    selectedDiff: selectedSha
      ? commits
          .find((c) => c.sha === selectedSha)
          ?.files.slice(0, 4)
          .map((f) => ({ file: f.filename, patch: f.patch?.slice(0, 1800) }))
      : undefined,
  }).slice(0, 14000);
}

export function boundedHistory<T extends { content: string }>(
  messages: T[],
  budget = 6000,
): T[] {
  let remaining = budget;
  return messages
    .slice(-6)
    .reverse()
    .map((m) => {
      const content = remaining > 0 ? m.content.slice(-remaining) : "";
      remaining -= content.length;
      return { ...m, content };
    })
    .filter((m) => m.content)
    .reverse();
}
