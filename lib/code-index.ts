import type { Commit, FileDiff } from "./types";
export type CodeSymbol = {
  name: string;
  kind: "function" | "component" | "class" | "type";
  file: string;
  change: "added" | "removed" | "modified";
};
export type CodeIndexRecord = {
  sha: string;
  summary: string;
  notes: string;
  indexedBy: string;
  updatedAt: string;
  symbols: CodeSymbol[];
};
function declaration(
  line: string,
): { name: string; kind: CodeSymbol["kind"] } | null {
  let match = line.match(
    /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/,
  );
  if (match)
    return {
      name: match[1],
      kind: /^[A-Z]/.test(match[1]) ? "component" : "function",
    };
  match = line.match(
    /\b(?:class|interface|type|def|fn|func)\s+([A-Za-z_$][\w$]*)/,
  );
  if (match)
    return {
      name: match[1],
      kind: /\bclass\s/.test(line)
        ? "class"
        : /\b(?:interface|type)\s/.test(line)
          ? "type"
          : "function",
    };
  match = line.match(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>)/,
  );
  if (match)
    return {
      name: match[1],
      kind: /^[A-Z]/.test(match[1]) ? "component" : "function",
    };
  return null;
}
export function symbolsForFile(file: FileDiff): CodeSymbol[] {
  const found = new Map<
    string,
    {
      symbol: Omit<CodeSymbol, "change">;
      added: boolean;
      removed: boolean;
      context: boolean;
    }
  >();
  for (const raw of (file.patch || "").split("\n")) {
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    const change = raw.startsWith("+")
      ? "added"
      : raw.startsWith("-")
        ? "removed"
        : raw.startsWith("@@")
          ? "context"
          : null;
    if (!change) continue;
    const symbol = declaration(raw.slice(change === "context" ? 0 : 1));
    if (!symbol) continue;
    const key = symbol.kind + ":" + symbol.name,
      entry = found.get(key) || {
        symbol: { ...symbol, file: file.filename },
        added: false,
        removed: false,
        context: false,
      };
    entry[change] = true;
    found.set(key, entry);
  }
  return [...found.values()]
    .slice(0, 100)
    .map((entry) => ({
      ...entry.symbol,
      change:
        entry.context || (entry.added && entry.removed)
          ? "modified"
          : entry.added
            ? "added"
            : "removed",
    }));
}
export function indexCommit(commit: Commit): CodeSymbol[] {
  return commit.files.flatMap(symbolsForFile).slice(0, 200);
}
export function canMaintainIndex(
  member: { workstream?: string; id: string },
  ownerId?: string,
) {
  return member.workstream === "index" || member.id === ownerId;
}
