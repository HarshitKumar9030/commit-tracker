import { hackathonTeam } from "./workflow";
import type { Workspace, Member } from "./types";
const seedMembers: Member[] = [
  {
    id: "harshit",
    name: "Harshit Kumar",
    login: "HarshitKumar9030",
    role: "Full-stack developer",
    focus: "Core features",
    color: "purple",
  },
  {
    id: "aanya",
    name: "Aanya Sharma",
    login: "aanya",
    role: "Frontend developer",
    focus: "Frontend UI",
    color: "pink",
  },
  {
    id: "rohan",
    name: "Rohan Patel",
    login: "rohan",
    role: "Backend developer",
    focus: "Backend API",
    color: "orange",
  },
  {
    id: "dev",
    name: "Dev Mehta",
    login: "dev",
    role: "Pitch & product",
    focus: "Presentation",
    color: "blue",
  },
];
export const members = hackathonTeam(seedMembers, "harshit");
export function demoWorkspace(): Workspace {
  const titles = [
    "Add real-time presence to the workspace",
    "Build the authentication flow",
    "Refine dashboard layout and navigation",
    "Set up project documentation",
    "Connect MongoDB and repository sync",
    "Create the initial project structure",
  ];
  return {
    mode: "demo",
    userId: "harshit",
    realtime: false,
    settings: {
      name: "Demo team",
      workflowVersion: 1,
      teamId: "demo",
      ownerId: "harshit",
      repo: "HarshitKumar9030/commit-tracker",
      branch: "main",
      members,
    },
    commits: titles.map((title, i) => ({
      sha: ["a7f3e2d", "b82c91a", "c4e8f02", "d9a1b36", "e3b7c54", "f1d2a98"][
        i
      ].padEnd(40, "0"),
      title,
      body:
        i === 0
          ? "Teammates can now see who is online and what everyone is working on. Presence reconnects automatically."
          : "Updated the project implementation and related files.",
      author: members[i % 2].login || members[i % 2].name.toLowerCase(),
      date: new Date(Date.now() - (i * 37 + 4) * 60000).toISOString(),
      branch: "main",
      url: "https://github.com/HarshitKumar9030/commit-tracker",
      additions: [128, 246, 84, 42, 96, 180][i],
      deletions: [24, 18, 32, 6, 12, 0][i],
      assignee: members[(i + 1) % 2].id,
      ...(i > 2
        ? {
            review: {
              verdict: "approved" as const,
              note: "Approved. No changes requested.",
              by: members[(i + 1) % 2].id,
              at: new Date().toISOString(),
            },
          }
        : {}),
      files: [
        {
          filename:
            i === 0 ? "src/hooks/use-presence.ts" : "src/app/workspace.tsx",
          status: "modified",
          additions: [128, 246, 84, 42, 96, 180][i],
          deletions: [24, 18, 32, 6, 12, 0][i],
          patch:
            '@@ -1,5 +1,12 @@\n import { useEffect, useState } from "react";\n-import { getStatus } from "./status";\n+import { Realtime } from "ably";\n \n export function usePresence() {\n-  return getStatus();\n+  const [members, setMembers] = useState([]);\n+  useEffect(() => {\n+    const channel = client.channels.get("workspace");\n+    channel.presence.subscribe(async () => {\n+      setMembers(await channel.presence.get());\n+    });\n+  }, []);\n+  return members;\n }',
        },
      ],
    })),
  };
}
