"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Plus,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Tablet,
  Check,
  Radio,
} from "lucide-react";
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CANVAS_COLORS,
  compactPoints,
  type CanvasInk,
  type CanvasPoint,
  type CanvasStroke,
} from "@/lib/canvas";
import { exportCanvasSvg, hitStroke, renderInk } from "@/lib/canvas-render";
import type { Member, Workspace } from "@/lib/types";
import { useCanvasBoard } from "./use-canvas-board";
type Change = { id: string; epoch: number; before: boolean; after: boolean };
type Remote = {
  at: number;
  epoch: number;
  by: string;
  ink?: CanvasInk;
  point: CanvasPoint;
};
const COLOR_NAMES = ["Charcoal", "Purple", "Rose", "Amber", "Green", "Blue"];
export default function TeamCanvas({
  data,
  user,
  onManage,
}: {
  data: Workspace;
  user: Member;
  onManage: () => void;
}) {
  const model = useCanvasBoard(data, user),
    surface = useRef<HTMLCanvasElement>(null),
    base = useRef<HTMLCanvasElement | null>(null),
    active = useRef<CanvasInk | null>(null),
    pointer = useRef<number | null>(null),
    remote = useRef(new Map<string, Remote>()),
    cursor = useRef<CanvasPoint | null>(null),
    frame = useRef(0),
    lastSend = useRef(0),
    erasing = useRef(false),
    erased = useRef(new Set<string>());
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen"),
    [color, setColor] = useState<string>(CANVAS_COLORS[1]),
    [width, setWidth] = useState(4),
    [finger, setFinger] = useState(false),
    [grid, setGrid] = useState(true),
    [expanded, setExpanded] = useState(false),
    [undo, setUndo] = useState<Change[]>([]),
    [redo, setRedo] = useState<Change[]>([]),
    [notice, setNotice] = useState(""),
    [drawing, setDrawing] = useState(false);
  const latest = useRef(model);
  latest.current = model;
  const paint = useCallback(() => {
    frame.current = 0;
    const canvas = surface.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(
      canvas.width / BOARD_WIDTH,
      0,
      0,
      canvas.height / BOARD_HEIGHT,
      0,
      0,
    );
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    if (base.current)
      ctx.drawImage(base.current, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    const snapshot = latest.current.snapshot,
      now = Date.now();
    for (const [key, value] of remote.current) {
      if (now - value.at > 4000 || value.epoch !== snapshot.epoch) {
        remote.current.delete(key);
        continue;
      }
      if (value.ink && !snapshot.strokes.some((s) => s.id === value.ink!.id))
        renderInk(ctx, value.ink);
      const member = data.settings.members.find((m) => m.id === value.by);
      ctx.save();
      ctx.strokeStyle = value.ink?.color || "#7554e8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(value.point[0], value.point[1], 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "15px Manrope, sans-serif";
      ctx.fillStyle = "#4e4867";
      ctx.fillText(
        member?.name || "Canvas User",
        Math.min(value.point[0] + 13, BOARD_WIDTH - 170),
        Math.max(20, value.point[1] - 12),
      );
      ctx.restore();
    }
    if (active.current) renderInk(ctx, active.current);
    if (cursor.current && latest.current.canEdit) {
      ctx.save();
      ctx.strokeStyle = tool === "eraser" ? "#e45578" : color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        cursor.current[0],
        cursor.current[1],
        tool === "eraser" ? 18 : Math.max(4, width),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }, [data.settings.members, tool, color, width]);
  const draw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);
  useEffect(() => {
    const canvas = surface.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(),
        ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [draw]);
  useEffect(() => {
    const bitmap = base.current || document.createElement("canvas");
    bitmap.width = BOARD_WIDTH;
    bitmap.height = BOARD_HEIGHT;
    base.current = bitmap;
    const ctx = bitmap.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    if (grid) {
      ctx.fillStyle = "#e8e7f0";
      for (let x = 24; x < BOARD_WIDTH; x += 32)
        for (let y = 24; y < BOARD_HEIGHT; y += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    for (const stroke of model.snapshot.strokes)
      if (!stroke.hidden) renderInk(ctx, stroke);
    draw();
  }, [model.snapshot, grid, draw]);
  useEffect(() => {
    model.onPreview.current = (value, by) => {
      if (value.kind === "leave") {
        remote.current.delete(by);
        draw();
        return;
      }
      if (value.epoch !== latest.current.snapshot.epoch) return;
      remote.current.set(by, {
        by,
        epoch: value.epoch,
        at: Date.now(),
        ink: value.kind === "ink" ? value.stroke : undefined,
        point:
          value.kind === "ink"
            ? value.stroke.points[value.stroke.points.length - 1]
            : value.point,
      });
      draw();
    };
    const timer = setInterval(() => {
      if (remote.current.size) draw();
    }, 500);
    return () => clearInterval(timer);
  }, [model.onPreview, draw]);
  useEffect(() => {
    setUndo([]);
    setRedo([]);
    active.current = null;
    pointer.current = null;
    cursor.current = null;
    remote.current.clear();
    draw();
  }, [model.snapshot.epoch]);
  useEffect(() => {
    if (!expanded) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  function point(event: PointerEvent): CanvasPoint {
    const rect = surface.current!.getBoundingClientRect();
    return [
      Math.round(
        Math.min(
          BOARD_WIDTH,
          Math.max(0, ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH),
        ) * 10,
      ) / 10,
      Math.round(
        Math.min(
          BOARD_HEIGHT,
          Math.max(
            0,
            ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
          ),
        ) * 10,
      ) / 10,
      Math.round((event.pointerType === "pen" ? event.pressure : 0.5) * 100) /
        100,
    ];
  }
  function record(change: Change) {
    setUndo((list) => [...list.slice(-99), change]);
    setRedo([]);
  }
  function erase(p: CanvasPoint) {
    const stroke = hitStroke(p, latest.current.snapshot.strokes);
    if (stroke && !erased.current.has(stroke.id)) {
      erased.current.add(stroke.id);
      if (
        model.mutate({
          kind: "visibility",
          epoch: model.snapshot.epoch,
          id: stroke.id,
          hidden: true,
        })
      )
        record({
          id: stroke.id,
          epoch: model.snapshot.epoch,
          before: false,
          after: true,
        });
    }
  }
  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (
      !model.canEdit ||
      !model.ready ||
      pointer.current !== null ||
      (event.pointerType === "touch" && !finger) ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    setDrawing(true);
    event.preventDefault();
    surface.current!.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    erasing.current =
      tool === "eraser" || event.button === 5 || (event.buttons & 32) !== 0;
    erased.current.clear();
    const p = point(event.nativeEvent);
    cursor.current = p;
    if (erasing.current) erase(p);
    else
      active.current = {
        id: crypto.randomUUID(),
        tool: tool === "highlighter" ? "highlighter" : "pen",
        color: color as CanvasInk["color"],
        width,
        points: [p],
      };
    draw();
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!model.canEdit || (event.pointerType === "touch" && !finger)) return;
    const p = point(event.nativeEvent);
    cursor.current = p;
    if (pointer.current === event.pointerId) {
      if (erasing.current) erase(p);
      else if (active.current) {
        const coalesced = event.nativeEvent.getCoalescedEvents?.() || [];
        for (const sample of coalesced.length
          ? coalesced
          : [event.nativeEvent]) {
          const next = point(sample),
            last = active.current.points[active.current.points.length - 1];
          if (Math.hypot(next[0] - last[0], next[1] - last[1]) > 0.5)
            active.current.points.push(next);
        }
        active.current.points = compactPoints(active.current.points);
      }
    }
    if (performance.now() - lastSend.current > 90) {
      lastSend.current = performance.now();
      model.sendPreview(
        active.current
          ? {
              kind: "ink",
              epoch: model.snapshot.epoch,
              stroke: { ...active.current, points: [...active.current.points] },
            }
          : { kind: "cursor", epoch: model.snapshot.epoch, point: p },
      );
    }
    draw();
  }
  function finish() {
    if (pointer.current === null) return;
    if (active.current) {
      const ink = active.current;
      if (
        !model.mutate({
          kind: "stroke",
          epoch: model.snapshot.epoch,
          stroke: { ...ink, points: [...ink.points] },
        })
      )
        return;
      record({
        id: ink.id,
        epoch: model.snapshot.epoch,
        before: true,
        after: false,
      });
      active.current = null;
    }
    pointer.current = null;
    setDrawing(false);
    erased.current.clear();
    model.sendPreview({ kind: "leave", epoch: model.snapshot.epoch });
    draw();
  }
  useEffect(() => {
    const blur = () => finish();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
    };
  });
  function history(direction: "undo" | "redo") {
    const list = direction === "undo" ? undo : redo,
      change = list.at(-1);
    if (!change) return;
    if (
      model.mutate({
        kind: "visibility",
        epoch: change.epoch,
        id: change.id,
        hidden: direction === "undo" ? change.before : change.after,
      })
    ) {
      if (direction === "undo") {
        setUndo((list) => list.slice(0, -1));
        setRedo((list) => [...list, change]);
      } else {
        setRedo((list) => list.slice(0, -1));
        setUndo((list) => [...list, change]);
      }
    }
  }
  function download(kind: "svg" | "png") {
    try {
      const strokes = active.current
        ? [
            ...model.snapshot.strokes,
            {
              ...active.current,
              by: user.id,
              createdAt: new Date().toISOString(),
            },
          ]
        : model.snapshot.strokes;
      if (kind === "svg") {
        const url = URL.createObjectURL(
          new Blob([exportCanvasSvg(strokes)], { type: "image/svg+xml" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `relay-board-${model.snapshot.epoch + 1}.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = BOARD_WIDTH;
        canvas.height = BOARD_HEIGHT;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        for (const stroke of strokes)
          if (!stroke.hidden) renderInk(ctx, stroke);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob),
            a = document.createElement("a");
          a.href = url;
          a.download = `relay-board-${model.snapshot.epoch + 1}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      }
      setNotice(`Board ${model.snapshot.epoch + 1} exported.`);
    } catch {
      setNotice("Export failed. Try the other format.");
    }
  }
  const archived = model.viewEpoch !== null,
    visibleCount = model.snapshot.strokes.filter((s) => !s.hidden).length;
  return (
    <section
      className={`team-canvas ${expanded ? "canvas-expanded" : ""}`}
      aria-label="Shared team canvas"
    >
      <div className="canvas-topline">
        <div className="canvas-heading">
          <span className="canvas-tablet-icon">
            <Tablet size={22} />
          </span>
          <div>
            <h2>Board {model.snapshot.epoch + 1}</h2>
            <p>
              {user.kind === "canvas"
                ? "Canvas User · pen and stylus input"
                : "Live view · Canvas Users can draw"}
            </p>
          </div>
        </div>
        <div className="canvas-top-actions">
          <label className="canvas-board-picker">
            Saved boards
            <select
              aria-label="Saved boards"
              value={
                model.viewEpoch === null ? "live" : String(model.viewEpoch)
              }
              onChange={(e) =>
                model.selectBoard(
                  e.target.value === "live" ? null : Number(e.target.value),
                )
              }
            >
              <option value="live">
                Current board · {model.snapshot.latestEpoch + 1}
              </option>
              {Array.from({ length: model.snapshot.latestEpoch }, (_, i) => (
                <option value={i} key={i}>
                  Saved board {i + 1}
                </option>
              ))}
            </select>
          </label>
          {
            <button
              className="secondary"
              disabled={!model.ready || model.saving || model.pending > 0}
              onClick={() => void model.newBoard()}
              data-tooltip="Start a new board. The current drawing stays in Saved boards."
            >
              <Plus size={16} />
              New board
            </button>
          }
          <button
            className="icon-button"
            aria-label={expanded ? "Exit expanded canvas" : "Expand canvas"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
      <div className="canvas-live-status">
        <span
          className={
            model.connection === "Live drawing" ? "canvas-connected" : ""
          }
        >
          <Radio size={13} />
          {model.connection}
        </span>
        <span role="status">
          {model.pending > 0 ? (
            <>
              <RefreshCw size={13} />
              {model.pending} changes waiting to save
            </>
          ) : model.ready ? (
            <>
              <Check size={13} />
              {data.mode === "demo"
                ? "Saved in this browser"
                : "All strokes saved"}
            </>
          ) : (
            "Loading saved board…"
          )}
        </span>
      </div>
      {
        <div
          className="canvas-toolbar"
          role="toolbar"
          aria-label="Drawing tools"
        >
          <div className="canvas-tool-group">
            {(
              [
                { id: "pen", label: "Pen", icon: PenTool },
                { id: "highlighter", label: "Highlighter", icon: Highlighter },
                { id: "eraser", label: "Eraser", icon: Eraser },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                aria-pressed={tool === item.id}
                disabled={!model.canEdit}
                className={tool === item.id ? "selected" : ""}
                onClick={() => setTool(item.id)}
                data-tooltip={
                  item.id === "eraser"
                    ? "Erase a whole stroke. Undo restores it."
                    : item.label
                }
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="canvas-colors" aria-label="Ink colors">
            {CANVAS_COLORS.map((ink, i) => (
              <button
                key={ink}
                disabled={!model.canEdit}
                aria-label={`${COLOR_NAMES[i]} ink`}
                aria-pressed={color === ink}
                onClick={() => setColor(ink)}
                style={{ background: ink }}
                className={color === ink ? "selected" : ""}
              >
                {color === ink ? <Check size={13} /> : null}
              </button>
            ))}
          </div>
          <label className="canvas-width">
            Size
            <input
              aria-label="Pen size"
              type="range"
              min={2}
              max={12}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            <span>{width}</span>
          </label>
          <div className="canvas-tool-group">
            <button
              aria-label="Undo canvas change"
              disabled={!model.canEdit || !undo.length}
              onClick={() => history("undo")}
              data-tooltip="Undo your last change from this session."
            >
              <Undo2 size={19} />
            </button>
            <button
              aria-label="Redo canvas change"
              disabled={!model.canEdit || !redo.length}
              onClick={() => history("redo")}
              data-tooltip="Redo the last undone change."
            >
              <Redo2 size={19} />
            </button>
          </div>
        </div>
      }
      {archived && (
        <p className="canvas-archive-note">
          Saved board · view only. Return to Current board to draw or follow the
          team live.
        </p>
      )}
      {model.error && (
        <div className="canvas-error" role="alert">
          <p>{model.error}</p>
          <button className="secondary" onClick={model.retry}>
            <RefreshCw size={14} />
            Retry save / reload
          </button>
        </div>
      )}
      <div className={`canvas-stage ${model.canEdit ? "editable" : ""}`}>
        <canvas
          ref={surface}
          width={1600}
          height={1000}
          aria-label="Team drawing board"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
          onPointerLeave={() => {
            if (pointer.current === null) {
              cursor.current = null;
              model.sendPreview({ kind: "leave", epoch: model.snapshot.epoch });
              draw();
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        {model.ready && visibleCount === 0 && !drawing && !active.current && (
          <div className="canvas-empty">
            <PenTool size={32} />
            <strong>
              {model.canEdit ? "Draw your first idea" : "The board is ready"}
            </strong>
            <span>
              {model.canEdit
                ? "Use your stylus or mouse. Enable finger drawing to draw by touch."
                : "A Canvas User’s strokes will appear here live."}
            </span>
          </div>
        )}
      </div>
      <div className="canvas-bottom">
        <div className="canvas-options">
          {
            <label>
              <input
                type="checkbox"
                checked={finger}
                onChange={(e) => setFinger(e.target.checked)}
              />
              Finger drawing
            </label>
          }
          <label>
            <input
              type="checkbox"
              checked={grid}
              onChange={(e) => setGrid(e.target.checked)}
            />
            Dot grid
          </label>
          <span>{visibleCount} strokes</span>
        </div>
        <div className="canvas-export">
          <button
            className="secondary"
            disabled={!model.ready}
            onClick={() => download("png")}
          >
            <Download size={14} />
            PNG
          </button>
          <button
            className="secondary"
            disabled={!model.ready}
            onClick={() => download("svg")}
          >
            <Download size={14} />
            SVG
          </button>
        </div>
      </div>
      <p className="canvas-footnote">
        <button className="text-button" onClick={onManage}>
          Manage Canvas User profile
        </button>
        {" · "}

        {data.mode === "demo"
          ? "Demo boards are stored in this browser. Live teams save drawings to MongoDB."
          : "Completed strokes save to MongoDB. Unsent changes are backed up on this device and retry when connected."}
        {user.kind === "canvas"
          ? " Finger drawing is off by default to reduce accidental palm marks."
          : ""}
      </p>
      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
