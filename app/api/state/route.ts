import type { CodeIndexRecord } from "@/lib/code-index";
import type { Commit } from "@/lib/types";
import { configured, db, settings, user, failure } from "@/lib/server";
export async function GET() {
  try {
    if (!configured()) return Response.json({ mode: "demo" });
    let u;
    try {
      u = await user();
    } catch {}
    if (!u)
      return Response.json({
        mode: "live",
        locked: true,
        members: [],
      });
    const s = await settings(u.teamId);
    const commits = await (
      await db()
    )
      .collection<Commit & { _id: string; repo: string; teamId?: string }>(
        "commits",
      )
      .find(
        { repo: s.repo, branch: s.branch, teamId: s.teamId },
        { projection: { _id: 0 } },
      )
      .sort({ date: -1 })
      .limit(100)
      .toArray();
    const codeIndex = await (
      await db()
    )
      .collection<
        CodeIndexRecord & { teamId: string; repo: string; branch: string }
      >("code_index")
      .find(
        {
          teamId: s.teamId,
          repo: s.repo,
          branch: s.branch,
          sha: { $in: commits.map((c) => c.sha) },
        },
        { projection: { _id: 0, teamId: 0, repo: 0, branch: 0 } },
      )
      .toArray();
    return Response.json(
      {
        mode: "live",
        codeIndex,
        settings: s,
        commits,
        userId: u.id,
        realtime: Boolean(process.env.ABLY_API_KEY),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
