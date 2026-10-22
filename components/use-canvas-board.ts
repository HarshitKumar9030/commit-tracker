"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Realtime, RealtimeChannel } from "ably";
import { z } from "zod";
import {
  applyCanvasOperation,
  canvasOperationSchema,
  canvasPreviewSchema,
  canvasSnapshotSchema,
  type CanvasOperation,
  type CanvasSnapshot,
} from "@/lib/canvas";
import type { Member, Workspace } from "@/lib/types";
import { api } from "./use-workspace";
const EMPTY: CanvasSnapshot = {
  epoch: 0,
  latestEpoch: 0,
  revision: 0,
  updatedAt: null,
  strokes: [],
};
const queueSchema = z
  .array(z.object({ id: z.string().uuid(), operation: canvasOperationSchema }))
  .max(100);
type Queued = z.infer<typeof queueSchema>[number];
type Preview = z.infer<typeof canvasPreviewSchema>;
type DemoStore = {
  latestEpoch: number;
  boards: Record<string, CanvasSnapshot>;
};
export function useCanvasBoard(data: Workspace, user: Member) {
  const [snapshot, setSnapshot] = useState<CanvasSnapshot>(EMPTY),
    [pending, setPending] = useState<Queued[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [connection, setConnection] = useState(
      data.mode === "demo" ? "Demo · this browser" : "Connecting…",
    ),
    [viewEpoch, setViewEpoch] = useState<number | null>(null),
    [saving, setSaving] = useState(false);
  const queue = useRef<Queued[]>([]),
    working = useRef(false),
    alive = useRef(true),
    request = useRef(0),
    view = useRef<number | null>(null),
    members = useRef(data.settings.members),
    previewChannel = useRef<RealtimeChannel | null>(null),
    sessionId = useRef(""),
    onPreview = useRef<(value: Preview, by: string) => void>(() => {});
  const teamId = data.settings.teamId || "workspace",
    isDemo = data.mode === "demo",
    queueKey = `relay-canvas-queue-v1:${teamId}:${user.id}`,
    demoKey = `relay-canvas-demo-v1:${teamId}`,
    cacheKey = `relay-canvas-cache-v1:${teamId}`;
  const canEdit = viewEpoch === null && pending.length < 100;
  useEffect(() => {
    members.current = data.settings.members;
  }, [data.settings.members]);
  function readDemo(): DemoStore {
    try {
      const stored = JSON.parse(localStorage.getItem(demoKey) || "null");
      if (
        stored &&
        Number.isInteger(stored.latestEpoch) &&
        stored.latestEpoch >= 0 &&
        stored.latestEpoch < 100 &&
        stored.boards
      )
        return stored;
    } catch {}
    return { latestEpoch: 0, boards: { "0": EMPTY } };
  }
  const refresh = useCallback(async () => {
    const id = ++request.current,
      selected = view.current;
    try {
      let next: CanvasSnapshot;
      if (isDemo) {
        const store = readDemo(),
          epoch = selected ?? store.latestEpoch;
        next = canvasSnapshotSchema.parse({
          ...(store.boards[epoch] || EMPTY),
          epoch,
          latestEpoch: store.latestEpoch,
        });
      } else
        next = canvasSnapshotSchema.parse(
          await api(`canvas${selected === null ? "" : `?epoch=${selected}`}`),
        );
      if (!alive.current || id !== request.current) return;
      setSnapshot(next);
      setReady(true);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        /* Optional read cache; pending writes use a separate durable queue. */
      }
    } catch (e) {
      if (alive.current && id === request.current)
        setError((e as Error).message);
    }
  }, [isDemo, teamId]);
  function writeQueue() {
    setPending([...queue.current]);
    try {
      localStorage.setItem(queueKey, JSON.stringify(queue.current));
      return true;
    } catch {
      setError(
        "Device backup is unavailable. Keep this tab open until all strokes are saved.",
      );
      return false;
    }
  }
  const flushRef = useRef<() => Promise<void>>(async () => {});
  flushRef.current = async () => {
    if (working.current || isDemo || !queue.current.length) return;
    working.current = true;
    if (alive.current) setSaving(true);
    try {
      while (queue.current.length && alive.current) {
        const item = queue.current[0];
        await api("canvas", item.operation);
        if (!alive.current) return;
        request.current++;
        setSnapshot((current) =>
          applyCanvasOperation(current, item.operation, user.id),
        );
        queue.current = queue.current.filter((q) => q.id !== item.id);
        writeQueue();
        setError("");
      }
      await refresh();
    } catch (e) {
      if (alive.current)
        setError(
          `${(e as Error).message} Your unsent changes stay on this device. Retry when connected.`,
        );
    } finally {
      working.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const mutate = (operation: CanvasOperation) => {
    if (isDemo) {
      try {
        const store = readDemo(),
          current = store.boards[operation.epoch] || {
            ...EMPTY,
            epoch: operation.epoch,
          };
        const next = applyCanvasOperation(current, operation, user.id);
        store.boards[operation.epoch] = {
          ...next,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(demoKey, JSON.stringify(store));
        setSnapshot({
          ...store.boards[operation.epoch],
          latestEpoch: store.latestEpoch,
        });
        setError("");
        return true;
      } catch {
        setError(
          "Browser storage is full or unavailable. Export the board before closing this tab.",
        );
        return false;
      }
    }
    if (queue.current.length >= 100) {
      setError(
        "100 changes are waiting to sync. Retry saving before drawing more.",
      );
      return false;
    }
    queue.current.push({ id: crypto.randomUUID(), operation });
    writeQueue();
    void flushRef.current();
    return true;
  };
  const selectBoard = (epoch: number | null) => {
    view.current = epoch;
    setViewEpoch(epoch);
    setReady(false);
    void refresh();
  };
  const newBoard = async () => {
    if (queue.current.length) return;
    setSaving(true);
    try {
      if (isDemo) {
        const store = readDemo();
        if (store.latestEpoch >= 99)
          throw new Error("This team already has 100 saved boards.");
        store.latestEpoch++;
        store.boards[store.latestEpoch] = {
          ...EMPTY,
          epoch: store.latestEpoch,
          latestEpoch: store.latestEpoch,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(demoKey, JSON.stringify(store));
      } else
        await api("canvas", { kind: "new-board", epoch: snapshot.latestEpoch });
      view.current = null;
      setViewEpoch(null);
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    sessionId.current = crypto.randomUUID();
    try {
      const cached = canvasSnapshotSchema.safeParse(
        JSON.parse(localStorage.getItem(cacheKey) || "null"),
      );
      if (cached.success && cached.data.epoch === cached.data.latestEpoch) {
        setSnapshot(cached.data);
        setReady(true);
      }
      if (!isDemo) {
        const saved = queueSchema.safeParse(
          JSON.parse(localStorage.getItem(queueKey) || "[]"),
        );
        if (saved.success) {
          queue.current = saved.data;
          setPending(saved.data);
        }
      }
    } catch {
      setError("Device backup could not be loaded.");
    }
    void refresh();
    void flushRef.current();
    const poll = setInterval(() => {
      void refresh();
      void flushRef.current();
    }, 15000);
    const online = () => {
      void refresh();
      void flushRef.current();
    };
    const storage = (event: StorageEvent) => {
      if (isDemo && event.key === demoKey) void refresh();
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (queue.current.length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("storage", storage);
    window.addEventListener("beforeunload", leave);
    return () => {
      alive.current = false;
      request.current++;
      clearInterval(poll);
      window.removeEventListener("online", online);
      window.removeEventListener("storage", storage);
      window.removeEventListener("beforeunload", leave);
    };
  }, [refresh, queueKey, isDemo]);
  useEffect(() => {
    if (isDemo) return;
    if (!data.realtime) {
      setConnection("Live drawing unavailable · saved changes sync every 15s");
      return;
    }
    let client: Realtime | undefined,
      stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    void import("ably")
      .then(({ Realtime }) => {
        if (stopped) return;
        client = new Realtime({
          authUrl: "/api/realtime",
          transports: ["web_socket"],
          queueMessages: false,
        });
        const live = client.channels.get(`relay-canvas-live:${teamId}`),
          saved = client.channels.get(`relay-canvas:${teamId}`);
        previewChannel.current = live;
        client.connection.on((change) => {
          if (stopped) return;
          setConnection(
            change.current === "connected"
              ? "Live drawing"
              : "Reconnecting · saved changes sync every 15s",
          );
          if (change.current === "connected") void refresh();
        });
        saved
          .subscribe("changed", () => {
            clearTimeout(timer);
            timer = setTimeout(() => void refresh(), 120);
          })
          .catch(() =>
            setConnection(
              "Live drawing unavailable · saved changes sync every 15s",
            ),
          );
        live
          .subscribe("preview", (message) => {
            if (
              stopped ||
              !members.current.some((m) => m.id === message.clientId) ||
              message.data?.sender === sessionId.current
            )
              return;
            const parsed = canvasPreviewSchema.safeParse(message.data?.value);
            if (parsed.success)
              onPreview.current(parsed.data, message.clientId!);
          })
          .catch(() =>
            setConnection(
              "Live drawing unavailable · saved changes sync every 15s",
            ),
          );
      })
      .catch(() =>
        setConnection(
          "Live drawing unavailable · saved changes sync every 15s",
        ),
      );
    return () => {
      stopped = true;
      clearTimeout(timer);
      previewChannel.current = null;
      client?.close();
    };
  }, [isDemo, data.realtime, teamId, user.id, user.kind, refresh]);
  const sendPreview = (value: Preview) => {
    if (!isDemo)
      void previewChannel.current
        ?.publish("preview", { sender: sessionId.current, value })
        .catch(() => {});
  };
  const display = useMemo(
    () =>
      pending.reduce(
        (state, item) => applyCanvasOperation(state, item.operation, user.id),
        snapshot,
      ),
    [pending, snapshot, user.id],
  );
  return {
    snapshot: display,
    ready,
    error,
    connection,
    canEdit,
    pending: pending.length,
    saving,
    viewEpoch,
    mutate,
    selectBoard,
    newBoard,
    retry: () => {
      setError("");
      void refresh();
      void flushRef.current();
    },
    sendPreview,
    onPreview,
  };
}
