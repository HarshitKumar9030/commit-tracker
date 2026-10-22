import { z } from "zod";
import { user, settings, db, publish, failure, ApiError } from "@/lib/server";
import {
  canMaintainIndex,
  indexCommit,
  type CodeIndexRecord,
} from "@/lib/code-index";
import type { Commit } from "@/lib/types";
export async function POST(req: Request) {
  try {
    const u = await user(),
      s = await settings();
    if (!canMaintainIndex(u, s.ownerId))
      throw new ApiError(
        403,
        "The code-index maintainer or team creator can edit index records.",
      );
    const input = z
      .object({
        sha: z.string().regex(/^[a-f0-9]{40}$/),
        summary: z.string().trim().min(1).max(240),
        notes: z.string().trim().min(1).max(4000),
      })
      .parse(await req.json());
    const database = await db(),
      key = `${u.teamId}:${s.repo}:${s.branch}:${input.sha}`;
    const commit = await database
      .collection<Commit & { _id: string }>("commits")
      .findOne({ _id: key });
    if (!commit)
      throw new ApiError(404, "Commit not found in this team repository.");
    const record: CodeIndexRecord = {
      ...input,
      indexedBy: u.id,
      updatedAt: new Date().toISOString(),
      symbols: indexCommit(commit),
    };
    await database
      .collection<
        CodeIndexRecord & {
          _id: string;
          teamId: string;
          repo: string;
          branch: string;
        }
      >("code_index")
      .updateOne(
        { _id: key },
        {
          $set: { ...record, teamId: u.teamId, repo: s.repo, branch: s.branch },
        },
        { upsert: true },
      );
    await publish();
    return Response.json({ ok: true, record });
  } catch (e) {
    return failure(e);
  }
}
