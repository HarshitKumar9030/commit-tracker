import { Rest } from "ably";
import { canvasOperationSchema, type CanvasStroke } from "@/lib/canvas";
import { user, db, failure, ApiError } from "@/lib/server";
type Board = {
  _id: string;
  epoch: number;
  revision: number;
  updatedAt: string | null;
};
type StoredStroke = CanvasStroke & {
  _id: string;
  teamId: string;
  epoch: number;
};
async function collections(teamId: string) {
  const database = await db(),
    boards = database.collection<Board>("canvas_boards"),
    strokes = database.collection<StoredStroke>("canvas_strokes");
  await strokes.createIndex({ teamId: 1, epoch: 1 });
  try {
    await boards.updateOne(
      { _id: teamId },
      { $setOnInsert: { epoch: 0, revision: 0, updatedAt: null } },
      { upsert: true },
    );
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e;
  }
  return { boards, strokes };
}
async function broadcast(teamId: string, epoch: number) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    await new Rest(process.env.ABLY_API_KEY).channels
      .get(`relay-canvas:${teamId}`)
      .publish("changed", { epoch });
  } catch {
    console.error(
      "Canvas saved; live notification failed. Clients will resync.",
    );
  }
}
export async function GET(req: Request) {
  try {
    const u = await user(),
      { boards, strokes } = await collections(u.teamId),
      board = (await boards.findOne({ _id: u.teamId }))!;
    const requested = new URL(req.url).searchParams.get("epoch");
    const epoch = requested === null ? board.epoch : Number(requested);
    if (!Number.isInteger(epoch) || epoch < 0 || epoch > board.epoch)
      throw new ApiError(400, "Choose an existing board.");
    const rows = await strokes
      .find({ teamId: u.teamId, epoch })
      .sort({ createdAt: 1, _id: 1 })
      .limit(2004)
      .toArray();
    return Response.json(
      {
        epoch,
        latestEpoch: board.epoch,
        revision: board.revision,
        updatedAt: board.updatedAt,
        strokes: rows.map(
          ({ id, tool, color, width, points, by, createdAt, hidden }) => ({
            id,
            tool,
            color,
            width,
            points,
            by,
            createdAt,
            hidden: hidden || false,
          }),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const u = await user();
    const raw = await req.text();
    if (raw.length > 65536)
      throw new ApiError(413, "Canvas operation is too large.");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ApiError(400, "Invalid canvas operation.");
    }
    const input = canvasOperationSchema.parse(json),
      { boards, strokes } = await collections(u.teamId),
      board = (await boards.findOne({ _id: u.teamId }))!;
    if (input.epoch > board.epoch)
      throw new ApiError(
        409,
        "This board is not available. Reload the canvas.",
      );
    const now = new Date().toISOString();
    let resultStroke: CanvasStroke | undefined;
    if (input.kind === "new-board") {
      if (board.epoch >= 99)
        throw new ApiError(400, "This team already has 100 saved boards.");
      const updated = await boards.findOneAndUpdate(
        { _id: u.teamId, epoch: input.epoch },
        { $inc: { epoch: 1, revision: 1 }, $set: { updatedAt: now } },
        { returnDocument: "after" },
      );
      if (!updated)
        throw new ApiError(
          409,
          "A teammate opened a new board. Reload the canvas.",
        );
      await broadcast(u.teamId, updated.epoch);
      return Response.json({ ok: true, epoch: updated.epoch });
    }
    const id = input.kind === "stroke" ? input.stroke.id : input.id,
      key = `${u.teamId}:${input.epoch}:${id}`;
    if (input.kind === "stroke") {
      const existing = await strokes.findOne({ _id: key });
      if (existing && existing.by !== u.id)
        throw new ApiError(409, "This stroke ID is already in use.");
      if (
        !existing &&
        (await strokes.countDocuments({
          teamId: u.teamId,
          epoch: input.epoch,
        })) >= 2000
      )
        throw new ApiError(
          400,
          "This board is full. Open a new board to keep drawing.",
        );
      resultStroke = {
        ...(existing
          ? {
              id: existing.id,
              tool: existing.tool,
              color: existing.color,
              width: existing.width,
              points: existing.points,
            }
          : input.stroke),
        by: u.id,
        createdAt: existing?.createdAt || now,
        hidden: existing?.hidden || false,
      };
      await strokes.updateOne(
        { _id: key },
        {
          $setOnInsert: {
            ...resultStroke,
            teamId: u.teamId,
            epoch: input.epoch,
          },
        },
        { upsert: true },
      );
    } else {
      const result = await strokes.updateOne(
        { _id: key },
        { $set: { hidden: input.hidden } },
      );
      if (!result.matchedCount) throw new ApiError(404, "Stroke not found.");
    }
    await boards.updateOne(
      { _id: u.teamId },
      { $inc: { revision: 1 }, $set: { updatedAt: now } },
    );
    await broadcast(u.teamId, input.epoch);
    return Response.json({
      ok: true,
      epoch: input.epoch,
      ...(resultStroke ? { stroke: resultStroke } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
