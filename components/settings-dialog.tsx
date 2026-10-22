"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Plus, Trash2, Users } from "lucide-react";
import type { Settings, Member } from "@/lib/types";
import { Modal } from "./primitives";
export default function SettingsDialog({
  settings,
  demo,
  userId,
  save,
  close,
}: {
  settings: Settings;
  demo: boolean;
  userId: string;
  save: (s: Settings) => Promise<void>;
  close: () => void;
}) {
  const [value, setValue] = useState({
      ...settings,
      name: settings.name || "Hackathon workspace",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  const canEdit = demo || !settings.ownerId || settings.ownerId === userId;
  const update = (id: string, patch: Partial<Member>) =>
    setValue((v) => ({
      ...v,
      members: v.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  async function copy(kind: string) {
    try {
      await navigator.clipboard.writeText(
        kind === "invite"
          ? `${location.origin}/?team=${value.teamId || "workspace"}`
          : `${location.origin}/api/webhooks/github?team=${value.teamId || "workspace"}`,
      );
      setCopied(kind);
    } catch {
      setError("Clipboard unavailable. Copy the team ID below manually.");
    }
  }
  return (
    <Modal title="Team settings" close={close}>
      <p className="muted">
        Manage the team, members, and monitored repository.
      </p>
      <div className="team-invite">
        <div>
          <small>TEAM ID</small>
          <code>{value.teamId || "workspace"}</code>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={() => copy("invite")}
        >
          {copied === "invite" ? <Check size={14} /> : <Copy size={14} />}Copy
          invite link
        </button>
      </div>
      {!canEdit && (
        <p className="setup-note">
          Only the team creator can change these settings. You can copy the
          invite link to share with a teammate.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(value);
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!canEdit} className="settings-fields">
          <label className="field">
            Team name
            <input
              required
              minLength={2}
              maxLength={60}
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
            />
          </label>
          <div className="two-fields">
            <label className="field">
              GitHub repository
              <input
                required
                pattern="[\w.\-]+/[\w.\-]+"
                value={value.repo}
                onChange={(e) => setValue({ ...value, repo: e.target.value })}
                placeholder="owner/repository"
              />
            </label>
            <label className="field">
              Branch
              <input
                required
                value={value.branch}
                onChange={(e) => setValue({ ...value, branch: e.target.value })}
              />
            </label>
          </div>
          <label className="field">Review assignment
            <select value={value.assignmentMode || "automatic"} onChange={e => setValue({...value, assignmentMode: e.target.value as "automatic" | "manual"})}>
              <option value="automatic">Automatic assignment</option><option value="manual">Assign manually</option>
            </select>
          </label>
          {value.assignmentMode !== "manual" && <label className="field">Default code reviewer
            <select value={value.defaultReviewerId || ""} onChange={e => setValue({...value, defaultReviewerId:e.target.value})}>
              <option value="">Rotate between code reviewers</option>
              {value.members.filter(m => m.receivesReviews !== false).map(m => <option key={m.id} value={m.id}>{m.name || "Unnamed member"}</option>)}
            </select>
          </label>}
          <label className="check-field"><input type="checkbox" checked={value.allowSelfReview || false} onChange={e => setValue({...value, allowSelfReview:e.target.checked})}/> Allow authors to review their own commits</label>
          <p className="muted">Choose one code reviewer below and turn off code reviews for presentation, product, and documentation teammates. Saving updates pending assignments. Without self-review, an author's own commits stay unassigned if no other reviewer is available.</p>
          <div className="member-list-heading">
            <h3>
              <Users size={15} />
              Members <span>{value.members.length}/20</span>
            </h3>
            <motion.button
              data-tooltip="Add a team profile. Save settings, then share the invite link and access code."
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="secondary"
              type="button"
              disabled={value.members.length >= 20}
              onClick={() =>
                setValue((v) => ({
                  ...v,
                  members: [
                    ...v.members,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      login: "",
                      role: "Developer",
                      focus: "Not set",
                      color: ["purple", "pink", "orange", "blue"][
                        v.members.length % 4
                      ],
                    },
                  ],
                }))
              }
            >
              <Plus size={14} />
              Add member
            </motion.button>
          </div>
          <AnimatePresence initial={false}>
            {value.members.map((m, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                key={m.id}
                className="editable-member"
              >
                <div className="editable-member-top">
                  <span>
                    Member {i + 1}
                    {m.id === value.ownerId ? " · Creator" : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${m.name || `member ${i + 1}`}`}
                    className="icon-button"
                    disabled={m.id === userId || value.members.length <= 1}
                    onClick={() =>
                      setValue((v) => ({
                        ...v,
                        members: v.members.filter((n) => n.id !== m.id),
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="two-fields">
                  <label className="field">
                    Name
                    <input
                      required
                      aria-label={`Member ${i + 1} name`}
                      maxLength={60}
                      value={m.name}
                      onChange={(e) => update(m.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    GitHub username (optional)
                    <input
                      pattern="[a-zA-Z0-9-]+"
                      aria-label={`Member ${i + 1} GitHub username`}
                      value={m.login}
                      onChange={(e) => update(m.id, { login: e.target.value })}
                    />
                  </label>
                </div>
                <label className="check-field"><input type="checkbox" checked={m.receivesReviews !== false} onChange={e => update(m.id, {receivesReviews:e.target.checked})}/> Receives code reviews</label>
                <label className="field role-field">
                  Role
                  <input
                    maxLength={80}
                    aria-label={`Member ${i + 1} role`}
                    value={m.role}
                    onChange={(e) => update(m.id, { role: e.target.value })}
                  />
                </label>
              </motion.div>
            ))}
          </AnimatePresence>
        </fieldset>
        <div className="setup-note">
          <strong>GitHub webhook</strong>
          <p>
            Use this URL with application/json, your GITHUB_WEBHOOK_SECRET, and
            push events. Share the access code separately from the invite link.
          </p>
          <button
            className="copy-url"
            type="button"
            onClick={() => copy("webhook")}
          >
            {copied === "webhook" ? <Check size={14} /> : <Copy size={14} />}
            Copy team webhook URL
          </button>
        </div>
        {demo && (
          <p className="muted">Demo changes are saved in this browser.</p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>
            Close
          </button>
          {canEdit && (
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
