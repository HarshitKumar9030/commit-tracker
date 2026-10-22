import type { FileDiff } from "./types";
export function formatDiff(files: FileDiff[]) {
  return files.map(f => `diff --git a/${f.filename} b/${f.filename}\n${f.patch || "[Text patch unavailable. Open this file on GitHub.]"}`).join("\n\n");
}
