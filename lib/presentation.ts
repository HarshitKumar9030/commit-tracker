import type { Workspace } from "./types";
export function presentationOutline(data: Workspace) {
  const indexed = (data.codeIndex || []).filter((r) =>
    data.commits.some((c) => c.sha === r.sha),
  );
  const approved = data.commits.filter((c) => c.review?.verdict === "approved");
  const indexer =
    data.settings.members.find((m) => m.workstream === "index")?.name ||
    "The index maintainer";
  return [
    {
      title: "The problem",
      time: "0:00–0:30",
      cue: "Explain why this exists",
      notes:
        "During a hackathon, code changes quickly. Developers need to keep building while the rest of the team understands what changed and prepares the demo.",
      evidence: `${data.settings.members.filter((m) => m.kind !== "canvas").length} teammates with separate responsibilities`,
      page: "Team",
    },
    {
      title: "How the team works",
      time: "0:30–1:30",
      cue: "Follow one change",
      notes: indexed[0]
        ? `${indexer} records the code structure after a commit. Start with “${indexed[0].summary}”. Open the source diff, point out the detected functions, and explain the saved notes in plain language.`
        : "Import a commit, assign a developer to review it, then save a code-index explanation. The presentation can reuse those notes.",
      evidence: `${indexed.length} documented changes · ${approved.length} approved reviews`,
      page: "Code index",
    },
    {
      title: "The live walkthrough",
      time: "1:30–3:00",
      cue: "Show the shared workspace",
      notes:
        "Open a commit and its review decision. Read the matching code-index record, sketch the architecture on the shared canvas, then return here and export the recap. Explain what is complete and what still needs work.",
      evidence: `${data.commits.filter((c) => !c.review).length} review${data.commits.filter((c) => !c.review).length === 1 ? "" : "s"} still pending · ${data.commits.length - indexed.length} commit${data.commits.length - indexed.length === 1 ? " needs" : "s need"} index notes`,
      page: "Canvas",
    },
  ];
}
export function presentationMarkdown(data: Workspace) {
  const indexed = (data.codeIndex || []).filter((r) =>
    data.commits.some((c) => c.sha === r.sha),
  );
  const approved = data.commits.filter((c) => c.review?.verdict === "approved");
  return `# ${data.settings.repo.split("/")[1]}${data.mode === "demo" ? " (sample demo)" : ""}\n\n## Suggested 3-minute walkthrough\n${presentationOutline(
    data,
  )
    .map((b) => `### ${b.time} ${b.title}\n${b.notes}\nEvidence: ${b.evidence}`)
    .join(
      "\n\n",
    )}\n\n## What we built\n${data.commits.map((c) => `- ${c.title} (${c.author})\n  ${c.body}`).join("\n")}\n\n## Code index\n${indexed.map((r) => `### ${r.sha.slice(0, 7)} ${r.summary}\n${r.notes}\n${r.symbols.map((s) => `- ${s.change}: ${s.kind} ${s.name} (${s.file})`).join("\n")}`).join("\n\n") || "Code index notes are still in progress."}\n\n## Reviewed & ready\n${approved.map((c) => `- ${c.title}: ${c.review!.note}`).join("\n") || "Reviews are still in progress."}\n\n## The team\n${data.settings.members
    .filter((m) => m.kind !== "canvas")
    .map((m) => `- ${m.name} (${m.role}): ${m.focus}`)
    .join("\n")}`;
}
