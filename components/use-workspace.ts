"use client";
import { assignReviewer } from "@/lib/assignment";
import { useCallback, useEffect, useState } from "react";
import type { Realtime } from "ably";
import type { Workspace } from "@/lib/types";
import { hackathonTeam } from "@/lib/workflow";
import { demoWorkspace } from "@/lib/demo";
export async function api(path: string, body?: unknown) {
  const r = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await r.json();
  if (!r.ok) throw new Error(value.error || "Request failed");
  return value;
}
function normalizeDemo(value: Workspace): Workspace {
  const tasks: Record<string, string> = {
    "Building the core": "Core features",
    "Crafting the experience": "Frontend UI",
    "Connecting the dots": "Backend API",
    "Making the pitch": "Presentation",
  };
  value.settings = {
    ...value.settings,
    name: value.settings.name || "Demo team",
    teamId: value.settings.teamId || "demo",
    members: value.settings.members.map(
      (m: Workspace["settings"]["members"][number]) => ({
        ...m,
        focus: tasks[m.focus] || m.focus,
      }),
    ),
  };
  if (!value.settings.workflowVersion) {
    value.settings = {
      ...value.settings,
      members: hackathonTeam(value.settings.members, value.settings.ownerId),
      workflowVersion: 1,
    };
    value.commits = value.commits.map((c) => ({
      ...c,
      assignee: !c.review
        ? assignReviewer(
            c.sha,
            c.author,
            value.settings.members,
            value.settings,
          )
        : c.assignee,
    }));
  }
  value.commits = value.commits.map((c: Workspace["commits"][number]) => ({
    ...c,
    body:
      c.body === "A small step forward for the hackathon workspace."
        ? "Updated the project implementation and related files."
        : c.body,
    ...(c.review?.note === "Looks good. Added this to our project recap."
      ? { review: { ...c.review, note: "Approved. No changes requested." } }
      : {}),
  }));
  return value;
}
function readDemo(): Workspace {
  try {
    const saved = localStorage.getItem("relay-demo-v1");
    if (saved) {
      const value = JSON.parse(saved);
      if (
        value.mode === "demo" &&
        value.settings?.members?.length > 0 &&
        value.settings.members.length <= 20 &&
        Array.isArray(value.commits)
      )
        return normalizeDemo(value);
    }
  } catch {}
  return normalizeDemo(demoWorkspace());
}
export function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null),
    [locked, setLocked] = useState<
      { id: string; name: string; color: string }[] | null
    >(null),
    [error, setError] = useState(""),
    [online, setOnline] = useState<string[]>([]),
    [connection, setConnection] = useState("Offline"),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      if (new URLSearchParams(location.search).has("demo")) {
        setData(readDemo());
        setLoading(false);
        return;
      }
      const state = await api("state");
      if (state.mode === "demo") {
        setData(readDemo());
        setLocked(null);
      } else if (
        state.locked ||
        (new URLSearchParams(location.search).get("team") &&
          new URLSearchParams(location.search).get("team") !==
            state.settings?.teamId)
      ) {
        setLocked(state.members || []);
        setData(null);
      } else {
        setData(state);
        setLocked(null);
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (data?.mode === "demo") {
      try {
        localStorage.setItem("relay-demo-v1", JSON.stringify(data));
      } catch {
        /* Browser storage can be unavailable in private mode. */
      }
    }
  }, [data]);
  useEffect(() => {
    if (!data || data.mode === "demo") {
      setConnection("Demo workspace");
      setOnline([]);
      return;
    }
    if (!data.realtime) {
      setConnection("Presence not configured");
      return;
    }
    let client: Realtime | undefined;
    let stopped = false;
    void import("ably").then(({ Realtime }) => {
      if (stopped) return;
      client = new Realtime({
        authUrl: "/api/realtime",
        transports: ["web_socket"],
        autoConnect: true,
      });
      const channel = client.channels.get(
        `relay:${data.settings.teamId || "workspace"}`,
      );
      client.connection.on((change) => {
        if (stopped) return;
        setConnection(
          change.current === "connected"
            ? "Live workspace"
            : change.current === "connecting"
              ? "Connecting…"
              : "Reconnecting…",
        );
        if (change.current !== "connected") setOnline([]);
      });
      channel.presence.subscribe(() => {
        void channel.presence
          .get()
          .then((ms) => {
            if (!stopped) setOnline([...new Set(ms.map((m) => m.clientId))]);
          })
          .catch(() => {});
      });
      channel.subscribe("refresh", () => void refresh());
      channel.presence
        .enter({})
        .catch(() => setConnection("Presence unavailable"));
    });
    const poll = setInterval(() => void refresh(), 30000);
    return () => {
      stopped = true;
      clearInterval(poll);
      client?.close();
      setOnline([]);
    };
  }, [
    data?.mode,
    data?.userId,
    data?.realtime,
    data?.settings.teamId,
    refresh,
  ]); // Reconnect only when identity or availability changes.
  return {
    data,
    setData,
    locked,
    error,
    setError,
    online,
    connection,
    loading,
    refresh,
  };
}
