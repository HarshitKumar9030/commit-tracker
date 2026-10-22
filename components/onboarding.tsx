"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowRight, Plus, LogIn, X } from "lucide-react";
import { api } from "./use-workspace";
import SignalMap from "./signal-map";
type PickMember = {
  id: string;
  name: string;
  color: string;
  kind?: "member" | "canvas";
};
export default function Onboarding({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [mode, setMode] = useState<"join" | "create">("join"),
    [teamId, setTeamId] = useState(
      () => new URLSearchParams(location.search).get("team") || "workspace",
    ),
    [code, setCode] = useState(""),
    [members, setMembers] = useState<PickMember[]>([]),
    [id, setId] = useState(""),
    [name, setName] = useState(""),
    [memberName, setMemberName] = useState(""),
    [login, setLogin] = useState(""),
    [repo, setRepo] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "create") {
        await api("teams", { name, memberName, login, repo, code });
        await onSuccess();
      } else if (!members.length) {
        const result = await api("session", { teamId, code });
        setMembers(result.members);
        setId(result.members[0]?.id || "");
        if (!result.members.length)
          throw Error("This team has no members. Create a new team.");
      } else {
        await api("session", { teamId, id, code });
        await onSuccess();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="join-page">
      <div className="join-brand">
        <Link2 />
        relay
        {onCancel && (
          <button
            className="icon-button onboarding-close"
            aria-label="Close team setup"
            onClick={onCancel}
          >
            <X />
          </button>
        )}
      </div>
      <div className="join-content">
        <SignalMap />
        <h1>{mode === "join" ? "Join a team" : "Create a team"}</h1>
        <p>
          {mode === "join"
            ? "Enter your team ID and access code to open the workspace."
            : "Set up a workspace, then add members in Team settings."}
        </p>
        <div className="onboarding-tabs">
          <button
            className={mode === "join" ? "selected" : ""}
            onClick={() => {
              setMode("join");
              setError("");
            }}
          >
            <LogIn size={15} />
            Join team
          </button>
          <button
            className={mode === "create" ? "selected" : ""}
            onClick={() => {
              setMode("create");
              setError("");
            }}
          >
            <Plus size={15} />
            Create team
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={submit}
          >
            {mode === "create" ? (
              <>
                <label className="field">
                  Team name
                  <input
                    required
                    minLength={2}
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Byte Builders"
                  />
                </label>
                <div className="two-fields">
                  <label className="field">
                    Your name
                    <input
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    GitHub username
                    <input
                      required
                      pattern="[a-zA-Z0-9-]+"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  Repository
                  <input
                    required
                    pattern="[\w.\-]+/[\w.\-]+"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="owner/repository"
                  />
                </label>
              </>
            ) : (
              <label className="field">
                Team ID
                <input
                  required
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setMembers([]);
                  }}
                  placeholder="Your team's ID"
                />
              </label>
            )}
            <label className="field">
              {mode === "create" ? "Choose an access code" : "Team access code"}
              <input
                required
                type="password"
                minLength={mode === "create" ? 8 : 1}
                maxLength={100}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setMembers([]);
                }}
                placeholder={
                  mode === "create"
                    ? "At least 8 characters"
                    : "Provided by your team creator"
                }
              />
            </label>
            {mode === "join" && members.length > 0 && (
              <label className="field">
                Choose your profile
                <select value={id} onChange={(e) => setId(e.target.value)}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.kind === "canvas" ? " · Canvas User" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "create"
                  ? "Create workspace"
                  : members.length
                    ? "Join workspace"
                    : "Find team"}
              <ArrowRight size={16} />
            </button>
            {mode === "create" && (
              <p className="onboarding-help">
                The creator manages membership. Share the team ID and access
                code with your members.
              </p>
            )}
            <a className="demo-link" href="/?demo=1">
              Open demo <ArrowRight size={13} />
            </a>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}
