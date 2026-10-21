import type { Settings } from "@/lib/types";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, failure, issueSession } from "@/lib/server";
import { hashCode } from "@/lib/team-security";
export async function POST(req: Request) {
  try {
    const input = z
      .object({
        name: z.string().trim().min(2).max(60),
        repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
        memberName: z.string().trim().min(1).max(60),
        login: z.string().regex(/^[a-zA-Z0-9-]+$/),
        code: z.string().min(8).max(100),
      })
      .parse(await req.json());
    const teamId = `${
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 28) || "team"
    }-${randomUUID().slice(0, 8)}`;
    const id = randomUUID();
    await (
      await db()
    )
      .collection<Settings & { _id: string; codeHash: string }>("settings")
      .insertOne({
        _id: teamId,
        name: input.name,
        teamId,
        ownerId: id,
        repo: input.repo,
        branch: "main",
        codeHash: hashCode(input.code),
        members: [
          {
            id,
            name: input.memberName,
            login: input.login,
            role: "Team lead",
            focus: "Project setup",
            color: "purple",
          },
        ],
      });
    await issueSession(id, teamId);
    return Response.json({ teamId }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
