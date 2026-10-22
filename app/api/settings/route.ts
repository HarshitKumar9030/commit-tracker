import type { Settings, Commit } from "@/lib/types";
import { isCodeReviewer } from "@/lib/member";
import { z } from "zod";
import { user, settings, db, publish, failure, ApiError } from "@/lib/server";
import { assignReviewer } from "@/lib/rules";
export async function POST(req: Request) {
  try {
    const u = await user();
    const current = await settings();
    if (current.ownerId && current.ownerId !== u.id)
      throw new ApiError(
        403,
        "Only the team creator can manage members and repository settings.",
      );
    const input = z
      .object({
        workflowVersion: z.number().int().min(1).max(10).optional(),
        assignmentMode: z.enum(["automatic", "manual"]).optional(),
        defaultReviewerId: z.string().max(80).optional(),
        allowSelfReview: z.boolean().optional(),
        name: z.string().trim().min(2).max(60),
        repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
        branch: z.string().min(1).max(100),
        members: z
          .array(
            z.object({
              id: z.string().min(1).max(80),
              name: z.string().trim().min(1).max(60),
              login: z.string().regex(/^[a-zA-Z0-9-]*$/),
              receivesReviews: z.boolean().optional(),
              kind: z.enum(["member", "canvas"]).optional(),
              workstream: z.enum(["code", "index", "presentation"]).optional(),
              role: z.string().max(80),
              focus: z.string().max(100),
              color: z.enum(["purple", "pink", "orange", "blue"]),
            }),
          )
          .min(1)
          .max(20)
          .refine(
            (ms) =>
              new Set(ms.map((m) => m.id)).size === ms.length &&
              new Set(
                ms.filter((m) => m.login).map((m) => m.login.toLowerCase()),
              ).size === ms.filter((m) => m.login).length,
            "Every teammate needs a unique identity and GitHub username.",
          ),
      })
      .parse(await req.json());
    input.members = input.members.map((m) =>
      m.kind === "canvas" || (m.workstream && m.workstream !== "code")
        ? { ...m, receivesReviews: false }
        : m,
    );
    if (!input.members.some((m) => m.id === u.id))
      throw new ApiError(400, "Keep yourself in the team.");
    if (
      input.defaultReviewerId &&
      !input.members.some(
        (m) => m.id === input.defaultReviewerId && isCodeReviewer(m),
      )
    )
      throw new ApiError(
        400,
        "Default reviewer must be a current code reviewer. Choose another reviewer or rotation.",
      );
    const database = await db();
    await database.collection<Settings & { _id: string }>("settings").updateOne(
      { _id: u.teamId },
      {
        $set: {
          ...input,
          teamId: u.teamId,
          ownerId: current.ownerId || u.id,
        },
      },
      { upsert: true },
    );
    const removed = current.members
      .filter(
        (m) => !input.members.some((n) => n.id === m.id && isCodeReviewer(n)),
      )
      .map((m) => m.id);
    {
      const col = database.collection<Commit & { _id: string; teamId: string }>(
        "commits",
      );
      const pending = await col
        .find({
          teamId: u.teamId,
          ...(input.defaultReviewerId !== current.defaultReviewerId ||
          input.assignmentMode !== current.assignmentMode ||
          input.allowSelfReview !== current.allowSelfReview
            ? {}
            : { assignee: { $in: [...removed, ""] } }),
          review: { $exists: false },
        })
        .toArray();
      for (const c of pending) {
        await col.updateOne(
          { _id: c._id },
          {
            $set: {
              assignee: assignReviewer(c.sha, c.author, input.members, input),
            },
          },
        );
      }
    }
    await publish();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
