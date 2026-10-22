import { z } from "zod";
export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 1000;
export const CANVAS_COLORS = [
  "#242435",
  "#7554e8",
  "#e45578",
  "#df8a25",
  "#238b79",
  "#387ac8",
] as const;
export const canvasPointSchema = z.tuple([
  z.number().min(0).max(BOARD_WIDTH),
  z.number().min(0).max(BOARD_HEIGHT),
  z.number().min(0).max(1),
]);
export const canvasInkSchema = z.object({
  id: z.string().uuid(),
  tool: z.enum(["pen", "highlighter"]),
  color: z.enum(CANVAS_COLORS),
  width: z.number().min(1).max(16),
  points: z.array(canvasPointSchema).min(1).max(512),
});
export type CanvasPoint = z.infer<typeof canvasPointSchema>;
export type CanvasInk = z.infer<typeof canvasInkSchema>;
export type CanvasStroke = CanvasInk & {
  by: string;
  createdAt: string;
  hidden?: boolean;
};
export type CanvasSnapshot = {
  epoch: number;
  latestEpoch: number;
  revision: number;
  updatedAt: string | null;
  strokes: CanvasStroke[];
};
export const canvasOperationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stroke"),
    epoch: z.number().int().min(0),
    stroke: canvasInkSchema,
  }),
  z.object({
    kind: z.literal("visibility"),
    epoch: z.number().int().min(0),
    id: z.string().uuid(),
    hidden: z.boolean(),
  }),
  z.object({ kind: z.literal("new-board"), epoch: z.number().int().min(0) }),
]);
export type CanvasOperation = z.infer<typeof canvasOperationSchema>;
export const canvasPreviewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ink"),
    epoch: z.number().int().min(0),
    stroke: canvasInkSchema,
  }),
  z.object({
    kind: z.literal("cursor"),
    epoch: z.number().int().min(0),
    point: canvasPointSchema,
  }),
  z.object({ kind: z.literal("leave"), epoch: z.number().int().min(0) }),
]);
export function canvasCapabilities(teamId: string): Record<string, string[]> {
  return {
    [`relay:${teamId}`]: ["subscribe", "presence"],
    [`relay-canvas:${teamId}`]: ["subscribe"],
    [`relay-canvas-live:${teamId}`]: ["subscribe", "publish"],
  };
}

/** Keep a long stroke bounded without discarding its beginning or endpoint. */
export function compactPoints(
  points: CanvasPoint[],
  limit = 512,
): CanvasPoint[] {
  if (points.length <= limit) return points;
  return Array.from(
    { length: limit },
    (_, i) => points[Math.round((i * (points.length - 1)) / (limit - 1))],
  );
}
export const canvasStrokeSchema = canvasInkSchema.extend({
  by: z.string().min(1).max(80),
  createdAt: z.string().max(40),
  hidden: z.boolean().optional(),
});
export const canvasSnapshotSchema = z.object({
  epoch: z.number().int().min(0).max(99),
  latestEpoch: z.number().int().min(0).max(99),
  revision: z.number().int().min(0),
  updatedAt: z.string().nullable(),
  strokes: z.array(canvasStrokeSchema).max(2004),
});
export function applyCanvasOperation(
  snapshot: CanvasSnapshot,
  operation: CanvasOperation,
  by: string,
  createdAt = new Date().toISOString(),
): CanvasSnapshot {
  if (operation.kind === "new-board" || operation.epoch !== snapshot.epoch)
    return snapshot;
  if (operation.kind === "stroke") {
    if (snapshot.strokes.some((s) => s.id === operation.stroke.id))
      return snapshot;
    return {
      ...snapshot,
      strokes: [
        ...snapshot.strokes,
        { ...operation.stroke, by, createdAt, hidden: false },
      ],
    };
  }
  return {
    ...snapshot,
    strokes: snapshot.strokes.map((s) =>
      s.id === operation.id ? { ...s, hidden: operation.hidden } : s,
    ),
  };
}
