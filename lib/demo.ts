import { hackathonTeam } from "./workflow";
import { indexCommit } from "./code-index";
import type { Workspace, Member, Commit } from "./types";
const seedMembers: Member[] = [
  {
    id: "harshit",
    name: "Harshit",
    login: "HarshitKumar9030",
    role: "Lead developer",
    focus: "Code architecture",
    color: "purple",
  },
  {
    id: "aanya",
    name: "Swarnim",
    login: "",
    role: "Developer",
    focus: "Feature development",
    color: "pink",
  },
  {
    id: "rohan",
    name: "Syed",
    login: "",
    role: "Code-index maintainer",
    focus: "Documenting commits",
    color: "orange",
  },
  {
    id: "dev",
    name: "Trisha",
    login: "",
    role: "Presentation",
    focus: "Demo story",
    color: "blue",
  },
];
export const members = hackathonTeam(seedMembers, "harshit");
export const DEMO_CONTENT_VERSION = 3;
// Illustrative diffs, not a mirror of the connected repository's history.
const examples = [
  {
    title: "Show reconnecting teammates in the presence list",
    body: "Keep a teammate visible during a short connection interruption. Show a reconnecting label until the WebSocket session recovers.",
    file: "hooks/use-presence.ts",
    patch:
      '@@ -1,4 +1,7 @@\n export function usePresence(channel) {\n-  return channel.members;\n+  const [members, setMembers] = useState([]);\n+  useEffect(() => subscribeToPresence(channel, setMembers), [channel]);\n+  return members;\n }\n+export function getConnectionLabel(state) {\n+  return state === "connected" ? "Online" : "Reconnecting";\n+}',
    summary: "Presence recovers without losing the teammate list",
    notes: "",
    review: "",
  },
  {
    title: "Add a shared canvas with pressure-sensitive strokes",
    body: "A tablet profile can sketch architecture while the team watches. Completed strokes are stored in MongoDB and can be reopened later.",
    file: "components/team-canvas.tsx",
    patch:
      '@@ -0,0 +1,9 @@\n+export type StrokePoint = { x: number; y: number; pressure: number };\n+export function TeamCanvas({ board, onStroke }) {\n+  return <canvas onPointerUp={onStroke} aria-label="Shared team canvas" />;\n+}\n+export function strokeWidth(pressure) {\n+  return 2 + pressure * 6;\n+}\n+export async function saveStroke(boardId, stroke) {\n+  return fetch(`/api/canvas/${boardId}`, { method: "POST", body: JSON.stringify(stroke) });\n+}',
    summary: "Shared drawing adds a visual explanation layer",
    notes:
      "Entry point: components/team-canvas.tsx. TeamCanvas handles stylus input; StrokePoint stores normalized coordinates and pressure. strokeWidth converts pressure into line width. saveStroke sends completed strokes to the server for MongoDB persistence.\n\nTeam impact: all four members can open the same board. The Canvas User is a tablet shortcut, not a separate private canvas.\n\nDemo cue for Trisha: sketch the commit → review → index flow on a tablet, then reopen the board to demonstrate persistence. Pressure varies by device; use a stylus for the full example.",
    review:
      "Pressure data reaches the save request. Confirmed the board can reopen after saving; check a physical stylus before the stage demo.",
  },
  {
    title: "Index functions and components from each commit diff",
    body: "Extract visible declaration changes and let the maintainer attach a readable explanation to each commit. The presentation reads these saved records.",
    file: "lib/code-index.ts",
    patch:
      '@@ -0,0 +1,10 @@\n+export type CodeSymbol = { name: string; file: string; change: string };\n+export function indexCommit(commit) {\n+  return commit.files.flatMap(file => extractDeclarations(file.patch));\n+}\n+export function extractDeclarations(patch) {\n+  return patch.split("\\n").filter(line => line.startsWith("+export function"));\n+}\n+export async function saveIndexRecord(sha, summary, notes) {\n+  return db.collection("code_index").updateOne({ sha }, { $set: { summary, notes } }, { upsert: true });\n+}',
    summary: "Commit diffs become a searchable code reference",
    notes:
      "Data flow: commit.files → indexCommit → extractDeclarations → CodeSymbol entries. The automatic pass identifies declarations visible in a diff; it does not understand the entire repository. Body-only changes need maintainer notes.\n\nsaveIndexRecord persists a summary and explanation under the commit SHA. Syed checks the diff, explains each function, and saves the record. Everyone can read it; Trisha can reuse it in the recap.\n\nDemo cue: search for indexCommit, open its diff, and explain why human notes are kept next to the detected symbols.",
    review:
      "Confirmed distinct symbol names and file paths are retained. Human notes cover behavior that declaration detection cannot infer.",
  },
  {
    title: "Route code reviews to developers only",
    body: "Keep Harshit and Swarnim in the review rotation while Syed documents changes and Trisha builds the presentation. Manual assignment remains available.",
    file: "lib/assignment.ts",
    patch:
      '@@ -1,3 +1,9 @@\n export function assignReviewer(commit, members) {\n-  return members[0]?.id;\n+  const eligible = members.filter(isCodeReviewer).filter(member => member.login !== commit.author);\n+  return eligible.length ? eligible[commit.sequence % eligible.length].id : "";\n }\n+export function isCodeReviewer(member) {\n+  return member.workstream === "code" && member.receivesReviews !== false;\n+}\n+export function needsManualAssignment(commit) {\n+  return !commit.assignee && !commit.review;\n+}',
    summary:
      "Reviews follow responsibilities instead of interrupting the whole team",
    notes:
      "assignReviewer now filters the roster through isCodeReviewer before selecting a reviewer. Index and presentation members are excluded. The author is excluded when their GitHub username matches.\n\nneedsManualAssignment identifies commits with no reviewer. If no other developer is eligible, the commit remains unassigned rather than going to Syed or Trisha.\n\nTeam setup: Harshit leads implementation; Swarnim is the code partner. Add both GitHub usernames in Team settings so author matching works. The demo uses sample commit authors.\n\nPresentation point: the team can divide work without losing visibility into code changes.",
    review:
      "Verified the author is excluded and non-code members are skipped. Empty reviewer pools leave the commit available for manual assignment.",
  },
  {
    title: "Save repository changes and review decisions in MongoDB",
    body: "Import commits once by SHA and retain existing review decisions when the repository is synced again.",
    file: "lib/repository.ts",
    patch:
      '@@ -0,0 +1,8 @@\n+export async function syncRepository(teamId, commits) {\n+  return Promise.all(commits.map(commit => upsertCommit(teamId, commit)));\n+}\n+export async function upsertCommit(teamId, commit) {\n+  return db.collection("commits").updateOne(\n+    { teamId, sha: commit.sha },\n+    { $set: commit, $setOnInsert: { importedAt: new Date() } }, { upsert: true }\n+  );\n+}',
    summary: "Repository sync creates a durable commit timeline",
    notes:
      "syncRepository is the import entry point. upsertCommit uses teamId + SHA to identify each imported change, so repeating an import does not create a second timeline item. Review data is kept separately from incoming repository fields.\n\nArchitecture: GitHub push → import handler → MongoDB → workspace refresh. The shared database supplies the review queue, code index, and recap.\n\nDemo cue: show the same commit in the feed and the code index. Both views refer to its SHA.",
    review:
      "Repeated sync keeps one entry per SHA. Existing reviewer decisions remain attached to the imported commit.",
  },
  {
    title: "Build the workspace and presentation recap",
    body: "Create a common workspace for the commit feed, code reference, shared canvas, and exportable presentation notes.",
    file: "components/workspace.tsx",
    patch:
      "@@ -0,0 +1,9 @@\n+export function Workspace({ commits, indexRecords }) {\n+  return <main><CommitFeed commits={commits} /><Presentation records={indexRecords} /></main>;\n+}\n+export function CommitFeed({ commits }) {\n+  return commits.map(commit => <CommitRow key={commit.sha} commit={commit} />);\n+}\n+export function Presentation({ records }) {\n+  return <section>{records.map(record => <article key={record.sha}>{record.summary}</article>)}</section>;\n+}",
    summary:
      "One workspace connects implementation with the final presentation",
    notes:
      "Workspace composes the team views. CommitFeed displays the shared timeline; Presentation reads the saved code-index records rather than requiring Trisha to read every diff.\n\nWorking agreement: developers build and review, Syed explains structure and new symbols, and Trisha turns verified notes into the demo. All members can use the shared canvas for explanations.\n\nPresentation point: demonstrate one change across all three stages: commit, documented behavior, presentation recap.",
    review:
      "Navigation and recap render from the same workspace data. Confirmed the exported notes include the saved index summary.",
  },
];
export function demoWorkspace(): Workspace {
  const now = Date.now();
  const commits: Commit[] = examples.map((example, i) => {
    const patchLines = example.patch.split("\n");
    const additions = patchLines.filter((l) => l.startsWith("+")).length;
    const deletions = patchLines.filter((l) => l.startsWith("-")).length;
    return {
      sha: ["a7f3e2d", "b82c91a", "c4e8f02", "d9a1b36", "e3b7c54", "f1d2a98"][
        i
      ].padEnd(40, "0"),
      title: example.title,
      body: example.body,
      author: i % 2 ? "swarnim-demo" : "HarshitKumar9030",
      date: new Date(now - (i * 37 + 4) * 60000).toISOString(),
      branch: "main",
      url: "https://github.com/HarshitKumar9030/commit-tracker",
      additions,
      deletions,
      assignee: members[(i + 1) % 2].id,
      ...(example.review
        ? {
            review: {
              verdict: "approved" as const,
              note: example.review,
              by: members[(i + 1) % 2].id,
              at: new Date(now - (i * 37 + 2) * 60000).toISOString(),
            },
          }
        : {}),
      files: [
        {
          filename: example.file,
          status: i === 0 || i === 3 ? "modified" : "added",
          additions,
          deletions,
          patch: example.patch,
        },
      ],
    };
  });
  return {
    mode: "demo",
    demoContentVersion: DEMO_CONTENT_VERSION,
    userId: "harshit",
    realtime: false,
    settings: {
      name: "Demo team",
      workflowVersion: 2,
      teamId: "demo",
      ownerId: "harshit",
      repo: "HarshitKumar9030/commit-tracker",
      branch: "main",
      members,
    },
    commits,
    codeIndex: commits.flatMap((commit, i) =>
      examples[i].notes
        ? [
            {
              sha: commit.sha,
              summary: examples[i].summary,
              notes: examples[i].notes,
              indexedBy: "rohan",
              updatedAt: commit.review!.at,
              symbols: indexCommit(commit),
            },
          ]
        : [],
    ),
  };
}
/** Upgrade bundled examples once, retaining team edits, custom notes and review decisions. */
export function upgradeDemoContent(value: Workspace): Workspace {
  if (
    value.mode !== "demo" ||
    (value.demoContentVersion || 0) >= DEMO_CONTENT_VERSION
  )
    return value;
  const sample = demoWorkspace();
  const seeds = new Map(sample.commits.map((c) => [c.sha, c]));
  const indexer =
    value.settings.members.find((m) => m.workstream === "index")?.id ||
    value.settings.ownerId ||
    value.settings.members[0].id;
  const existing = new Set((value.codeIndex || []).map((r) => r.sha));
  return {
    ...value,
    demoContentVersion: DEMO_CONTENT_VERSION,
    commits: value.commits.map((c) => {
      const seed = seeds.get(c.sha);
      if (!seed) return c;
      const genericReview =
        !c.review ||
        [
          "Approved. No changes requested.",
          "Looks good. Added this to our project recap.",
        ].includes(c.review.note);
      return {
        ...seed,
        date: c.date,
        assignee: c.assignee,
        ...(genericReview ? {} : { review: c.review }),
      };
    }),
    codeIndex: [
      ...(value.codeIndex || []),
      ...(sample.codeIndex || [])
        .filter(
          (r) =>
            !existing.has(r.sha) && value.commits.some((c) => c.sha === r.sha),
        )
        .map((r) => ({ ...r, indexedBy: indexer })),
    ],
  };
}
