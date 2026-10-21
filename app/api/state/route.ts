import type { Commit } from "@/lib/types";
import { configured, db, settings, user, failure } from "@/lib/server";
export async function GET() {
  try {
    if (!configured()) return Response.json({ mode: "demo" });
    const s = await settings();
    let u;
    try {
      u = await user();
    } catch {}
    if (!u)
      return Response.json({
        mode: "live",
        locked: true,
        members: s.members.map(({ id, name, color }) => ({ id, name, color })),
      });
    const commits = await (
      await db()
    )
      .collection<Commit & { _id: string; repo: string }>("commits")
      .find({ repo: s.repo, branch: s.branch }, { projection: { _id: 0 } })
      .sort({ date: -1 })
      .limit(100)
      .toArray();
    return Response.json(
      {
        mode: "live",
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
