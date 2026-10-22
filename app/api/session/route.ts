import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, db, failure, settings, issueSession } from "@/lib/server";
import { verifyCode } from "@/lib/team-security";
export async function POST(req: Request) {
  try {
    const { id, code, teamId } = z
      .object({
        teamId: z
          .string()
          .regex(/^[a-zA-Z0-9-]+$/)
          .default("workspace"),
        id: z.string().optional(),
        code: z.string().max(200),
      })
      .parse(await req.json());
    const record = await (
      await db()
    )
      .collection<{ _id: string; codeHash?: string }>("settings")
      .findOne({ _id: teamId });
    let valid = false;
    if (record?.codeHash) valid = verifyCode(code, record.codeHash);
    else if (teamId === "workspace" && process.env.TEAM_ACCESS_CODE) {
      const a = Buffer.from(code),
        b = Buffer.from(process.env.TEAM_ACCESS_CODE);
      valid = a.length === b.length && timingSafeEqual(a, b);
    }
    if (!valid) throw new ApiError(401, "Check your team ID and access code.");
    const s = await settings(teamId);
    if (!id)
      return Response.json({
        members: s.members.map(({ id, name, color, kind }) => ({
          id,
          name,
          color,
          kind,
        })),
        name: s.name,
      });
    if (!s.members.some((m) => m.id === id))
      throw new ApiError(400, "Choose a team member.");
    await issueSession(id, teamId);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE() {
  (await cookies()).delete("relay-session");
  return Response.json({ ok: true });
}
