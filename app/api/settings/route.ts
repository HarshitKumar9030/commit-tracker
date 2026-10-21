import type { Settings } from "@/lib/types";
import { z } from "zod";
import { user, db, publish, failure } from "@/lib/server";
export async function POST(req: Request) {
  try {
    await user();
    const data = z
      .object({
        repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
        branch: z.string().min(1).max(100),
        members: z
          .array(
            z.object({
              id: z.enum(["harshit", "aanya", "rohan", "dev"]),
              name: z.string().trim().min(1).max(60),
              login: z.string().regex(/^[a-zA-Z0-9-]+$/),
              role: z.string().max(80),
              focus: z.string().max(100),
              color: z.enum(["purple", "pink", "orange", "blue"]),
            }),
          )
          .length(4)
          .refine(
            (ms) =>
              new Set(ms.map((m) => m.id)).size === 4 &&
              new Set(ms.map((m) => m.login.toLowerCase())).size === 4,
          ),
      })
      .parse(await req.json());
    await (
      await db()
    )
      .collection<Settings & { _id: string }>("settings")
      .updateOne({ _id: "workspace" }, { $set: data }, { upsert: true });
    await publish();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
