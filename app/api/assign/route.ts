import { isCodeReviewer } from "@/lib/member";
import { z } from "zod";
import { user, settings, db, publish, failure, ApiError } from "@/lib/server";
import type { Commit } from "@/lib/types";
export async function POST(req: Request) {
  try {
    await user();
    const input = z
      .object({
        sha: z.string().regex(/^[a-f0-9]{40}$/),
        assignee: z.string().max(80),
      })
      .parse(await req.json());
    const s = await settings();
    const col = (await db()).collection<Commit & { _id: string }>("commits");
    const key = `${s.teamId}:${s.repo}:${s.branch}:${input.sha}`;
    const commit = await col.findOne({ _id: key });
    if (!commit) throw new ApiError(404, "Commit not found.");
    const member = s.members.find(
      (m) => m.id === input.assignee && isCodeReviewer(m),
    );
    if (
      input.assignee &&
      (!member ||
        (!s.allowSelfReview &&
          member.login.toLowerCase() === commit.author.toLowerCase()))
    )
      throw new ApiError(
        400,
        "Choose an eligible code reviewer. Self-review must be enabled in team settings.",
      );
    const result = await col.updateOne(
      { _id: key, review: { $exists: false } },
      { $set: { assignee: input.assignee } },
    );
    if (!result.matchedCount)
      throw new ApiError(409, "Completed reviews cannot be reassigned.");
    await publish();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
