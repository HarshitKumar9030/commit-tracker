import type { Member } from "./types";
export const WORKSTREAMS = {
  code: "Code",
  index: "Code index",
  presentation: "Presentation",
} as const;
export function hackathonTeam(existing: Member[], ownerId?: string): Member[] {
  const people = existing.filter((m) => m.kind !== "canvas"),
    owner = people.find((m) => m.id === ownerId),
    ordered = owner
      ? [owner, ...people.filter((m) => m.id !== ownerId)]
      : people;
  const roles = [
    {
      name: "Harshit",
      role: "Lead developer",
      workstream: "code",
      focus: "Code architecture and implementation",
    },
    {
      name: "Swarnim",
      role: "Developer",
      workstream: "code",
      focus: "Feature development",
    },
    {
      name: "Syed",
      role: "Code-index maintainer",
      workstream: "index",
      focus: "Documenting commits, functions, and components",
    },
    {
      name: "Trisha",
      role: "Presentation",
      workstream: "presentation",
      focus: "Demo story and presentation",
    },
  ] as const;
  const team: Member[] = roles.map((config, i) => {
    const current = ordered[i];
    return {
      ...current,
      id: current?.id || crypto.randomUUID(),
      color: current?.color || ["purple", "pink", "orange", "blue"][i],
      login: current?.name.toLowerCase().startsWith(config.name.toLowerCase())
        ? current.login
        : "",
      kind: "member",
      ...config,
      receivesReviews: config.workstream === "code",
    };
  });
  const tablet = existing.find((m) => m.kind === "canvas");
  return [
    ...team,
    ...ordered.slice(4),
    tablet || {
      id: crypto.randomUUID(),
      name: "Canvas User",
      login: "",
      role: "Shared tablet",
      focus: "Explaining ideas on the shared canvas",
      color: "blue",
      kind: "canvas",
      receivesReviews: false,
    },
  ];
}
