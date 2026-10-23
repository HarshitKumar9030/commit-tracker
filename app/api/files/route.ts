import { z } from "zod";
import { user, settings, db, publish, failure, ApiError } from "@/lib/server";
import {
  parseDriveLink,
  teamFileInput,
  canManageFile,
  type TeamFile,
} from "@/lib/team-files";
type StoredFile = TeamFile & { _id: string; teamId: string };
export async function POST(req: Request) {
  try {
    const u = await user(),
      s = await settings(u.teamId),
      database = await db();
    const raw = await req.json();
    const action = z
      .enum(["add", "update", "archive", "restore"])
      .parse(raw.action);
    const col = database.collection<StoredFile>("team_files");
    if (action === "add") {
      const input = teamFileInput.parse(raw);
      const link = parseDriveLink(input.url),
        id = link.driveId,
        now = new Date().toISOString();
      const key = `${u.teamId}:${id}`;
      const existing = await col.findOne({ _id: key });
      if (existing)
        throw new ApiError(
          409,
          existing.archivedAt
            ? "This file is archived. Restore it from Archived files."
            : "This Drive file is already shared with the team.",
        );
      if ((await col.countDocuments({ teamId: u.teamId })) >= 500)
        throw new ApiError(
          400,
          "This team has reached the 500 shared-link limit.",
        );
      const file: TeamFile = {
        ...input,
        ...link,
        id,
        addedBy: u.id,
        addedAt: now,
        updatedAt: now,
        pinned: false,
      };
      try {
        await col.insertOne({ ...file, _id: key, teamId: u.teamId });
      } catch (error) {
        if ((error as { code?: number }).code === 11000)
          throw new ApiError(
            409,
            "This Drive file is already shared with the team.",
          );
        throw error;
      }
    } else {
      const { id } = z
        .object({ id: z.string().regex(/^[a-zA-Z0-9_-]{5,200}$/) })
        .parse(raw);
      const key = `${u.teamId}:${id}`,
        file = await col.findOne({ _id: key });
      if (!file) throw new ApiError(404, "File not found in this team.");
      if (!canManageFile(file, u.id, s.ownerId))
        throw new ApiError(
          403,
          "Only the person who shared this file or the team creator can change its entry.",
        );
      const now = new Date().toISOString();
      if (action === "archive")
        await col.updateOne(
          { _id: key },
          { $set: { archivedAt: now, updatedAt: now } },
        );
      else if (action === "restore")
        await col.updateOne(
          { _id: key },
          { $unset: { archivedAt: "" }, $set: { updatedAt: now } },
        );
      else {
        const patch = teamFileInput
          .omit({ url: true })
          .extend({ pinned: z.boolean() })
          .parse(raw);
        await col.updateOne(
          { _id: key },
          { $set: { ...patch, updatedAt: now } },
        );
      }
    }
    await publish(u.teamId);
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
