import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, failure, settings, sign } from "@/lib/server";
export async function POST(req: Request) {
  try {
    const { id, code } = z
      .object({ id: z.string(), code: z.string().max(200) })
      .parse(await req.json());
    const expected = process.env.TEAM_ACCESS_CODE;
    if (!expected)
      throw new ApiError(503, "Set TEAM_ACCESS_CODE to enable team access.");
    const a = Buffer.from(code),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new ApiError(401, "That workspace code is incorrect.");
    if (!(await settings()).members.some((m) => m.id === id))
      throw new ApiError(400, "Choose a team member.");
    const body = Buffer.from(
      JSON.stringify({ id, exp: Date.now() + 7 * 86400000 }),
    ).toString("base64url");
    (await cookies()).set("relay-session", `${body}.${sign(body)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE() {
  (await cookies()).delete("relay-session");
  return Response.json({ ok: true });
}
