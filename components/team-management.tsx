"use client";
import { hackathonTeam, WORKSTREAMS } from "@/lib/workflow";
import { isCodeReviewer } from "@/lib/member";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Plus, Trash2, Users } from "lucide-react";
import type { Settings, Member } from "@/lib/types";
import { Avatar } from "./primitives";
export default function TeamManagement({
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
  const [tab, setTab] = useState("members");
  const [selectedMember, setSelectedMember] = useState(
    settings.ownerId || settings.members[0].id,
  );
  const selectedId = value.members.some((m) => m.id === selectedMember)
    ? selectedMember
    : value.members[0].id;
  function addProfile(kind: "member" | "canvas") {
    const id = crypto.randomUUID();
    setValue((v) => ({
      ...v,
      members: [
        ...v.members,
        {
          id,
          name: kind === "canvas" ? "Tablet canvas" : "",
          login: "",
          role: kind === "canvas" ? "Canvas User" : "Developer",
          focus: kind === "canvas" ? "Explaining ideas" : "Not set",
          color: ["purple", "pink", "orange", "blue"][v.members.length % 4],
          kind,
          ...(kind === "canvas"
            ? { receivesReviews: false }
            : { workstream: "code" as const }),
        },
      ],
    }));
    setSelectedMember(id);
  }
  const dirty =
    JSON.stringify(value) !==
    JSON.stringify({
      ...settings,
      name: settings.name || "Hackathon workspace",
    });
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
    <section className="team-management">
      <div className="management-hero">
        <div>
          <span className="eyebrow">WORKSPACE SETUP</span>
          <h2>Team members and responsibilities</h2>
          <p>
            Set responsibilities, choose reviewers, and keep everyone working
            from the same repository.
          </p>
        </div>
        <button type="button" className="secondary" onClick={close}>
          View team
        </button>
      </div>
      <div className="management-counts">
        {[
          [
            "Teammates",
            value.members.filter((m) => m.kind !== "canvas").length,
          ],
          ["Code reviewers", value.members.filter(isCodeReviewer).length],
          [
            "Shared tablets",
            value.members.filter((m) => m.kind === "canvas").length,
          ],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div
        className="management-tabs"
        role="tablist"
        aria-label="Team management sections"
        onKeyDown={(e) => {
          const tabs = ["members", "routing", "repository"];
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? 2
                : (tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          setTab(tabs[next]);
          document.getElementById(`management-tab-${tabs[next]}`)?.focus();
        }}
      >
        {[
          ["members", "Members & roles"],
          ["routing", "Review routing"],
          ["repository", "Repository & invites"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`management-tab-${id}`}
            aria-controls={`management-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!canEdit && (
        <p className="setup-note">
          Only the team creator can change these settings. You can copy the
          invite link to share with a teammate.
        </p>
      )}
      <form
        onInvalidCapture={(e) => {
          const panel = (e.target as HTMLElement).closest<HTMLElement>(
            '[role="tabpanel"]',
          );
          if (panel) setTab(panel.id.replace("management-panel-", ""));
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(value);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="settings-fields">
          <div
            role="tabpanel"
            id="management-panel-repository"
            aria-labelledby="management-tab-repository"
            hidden={tab !== "repository"}
          >
            <fieldset disabled={!canEdit} className="settings-fields">
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
                  {copied === "invite" ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  Copy invite link
                </button>
              </div>
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
                    onChange={(e) =>
                      setValue({ ...value, repo: e.target.value })
                    }
                    placeholder="owner/repository"
                  />
                </label>
                <label className="field">
                  Branch
                  <input
                    required
                    value={value.branch}
                    onChange={(e) =>
                      setValue({ ...value, branch: e.target.value })
                    }
                  />
                </label>
              </div>
            </fieldset>
          </div>
          <div
            role="tabpanel"
            id="management-panel-routing"
            aria-labelledby="management-tab-routing"
            hidden={tab !== "routing"}
          >
            <fieldset disabled={!canEdit} className="settings-fields">
              <h3>Who reviews incoming commits?</h3>
              <p className="muted">
                Keep code reviews with your developers. Index and presentation
                teammates can focus on their own work.
              </p>
              <label className="field">
                Review assignment
                <select
                  value={value.assignmentMode || "automatic"}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      assignmentMode: e.target.value as "automatic" | "manual",
                    })
                  }
                >
                  <option value="automatic">Automatic assignment</option>
                  <option value="manual">Assign manually</option>
                </select>
              </label>
              {value.assignmentMode !== "manual" && (
                <label className="field">
                  Default code reviewer
                  <select
                    value={value.defaultReviewerId || ""}
                    onChange={(e) =>
                      setValue({ ...value, defaultReviewerId: e.target.value })
                    }
                  >
                    <option value="">Rotate between code reviewers</option>
                    {value.members.filter(isCodeReviewer).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || "Unnamed member"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={value.allowSelfReview || false}
                  onChange={(e) =>
                    setValue({ ...value, allowSelfReview: e.target.checked })
                  }
                />{" "}
                Allow authors to review their own commits
              </label>
              <p className="muted">
                Choose one code reviewer below and turn off code reviews for
                presentation, product, and documentation teammates. Saving
                updates pending assignments. Without self-review, an author's
                own commits stay unassigned if no other reviewer is available.
              </p>
            </fieldset>
          </div>
          <div
            role="tabpanel"
            id="management-panel-members"
            aria-labelledby="management-tab-members"
            hidden={tab !== "members"}
          >
            <details className="workflow-preset">
              <summary>Four-person hackathon setup</summary>
              <p>
                Harshit + Swarnim code. Syed maintains the code index. Trisha
                prepares the presentation. The Canvas User is a separate shared
                tablet profile.
              </p>
              <button
                type="button"
                className="secondary"
                disabled={!canEdit}
                onClick={() =>
                  setValue((v) => ({
                    ...v,
                    members: hackathonTeam(v.members, v.ownerId),
                    workflowVersion: 2,
                    assignmentMode: "automatic",
                    defaultReviewerId: "",
                    allowSelfReview: false,
                  }))
                }
              >
                Apply team setup
              </button>
            </details>
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
                disabled={!canEdit || value.members.length >= 20}
                onClick={() => addProfile("member")}
              >
                <Plus size={14} />
                Add member
              </motion.button>
            </div>
            <button
              className="secondary add-canvas-profile"
              type="button"
              disabled={!canEdit || value.members.length >= 20}
              onClick={() => addProfile("canvas")}
            >
              Add Canvas User
            </button>
            <p className="muted">
              A Canvas User opens the drawing view on sign-in. All teammates can
              draw on the same shared canvas. Sign in on your tablet with the
              team code and select this profile.
            </p>
            <div className="management-roster-layout">
              <nav
                className="management-roster"
                aria-label="Select a team member"
              >
                {value.members.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    aria-pressed={selectedId === m.id}
                    onClick={() => setSelectedMember(m.id)}
                  >
                    <Avatar member={m} small />
                    <span>
                      <strong>{m.name || "New member"}</strong>
                      <small>
                        {m.kind === "canvas"
                          ? "Shared tablet"
                          : WORKSTREAMS[m.workstream || "code"]}
                        {m.id === value.ownerId ? " · Creator" : ""}
                      </small>
                    </span>
                  </button>
                ))}
              </nav>
              <fieldset
                disabled={!canEdit}
                className="settings-fields management-member-grid"
              >
                <AnimatePresence initial={false}>
                  {value.members.map((m, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      key={m.id}
                      className="editable-member"
                      data-member-id={m.id}
                      hidden={m.id !== selectedId}
                    >
                      <div className="editable-member-top">
                        <span>
                          <Avatar member={m} small /> {m.name || "New member"}
                          {m.id === value.ownerId ? " · Creator" : ""}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${m.name || `member ${i + 1}`}`}
                          className="icon-button"
                          disabled={
                            m.id === userId ||
                            m.id === value.ownerId ||
                            value.members.length <= 1
                          }
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
                      <label className="field">
                        Profile type
                        <select
                          aria-label={`Member ${i + 1} profile type`}
                          value={m.kind || "member"}
                          onChange={(e) => {
                            const kind = e.target.value as "member" | "canvas";
                            update(m.id, {
                              kind,
                              ...(kind === "canvas"
                                ? {
                                    receivesReviews: false,
                                    role: "Canvas User",
                                  }
                                : {}),
                            });
                            if (
                              value.defaultReviewerId === m.id &&
                              kind === "canvas"
                            )
                              setValue((v) => ({
                                ...v,
                                defaultReviewerId: "",
                              }));
                          }}
                        >
                          <option value="member">Team member</option>
                          <option value="canvas">
                            Canvas User · tablet drawing
                          </option>
                        </select>
                      </label>
                      {m.kind !== "canvas" && (
                        <label className="field">
                          Responsibility
                          <select
                            aria-label={`Member ${i + 1} responsibility`}
                            value={m.workstream || "code"}
                            onChange={(e) => {
                              const workstream = e.target
                                .value as Member["workstream"];
                              update(m.id, {
                                workstream,
                                receivesReviews: workstream === "code",
                              });
                              if (
                                value.defaultReviewerId === m.id &&
                                workstream !== "code"
                              )
                                setValue((v) => ({
                                  ...v,
                                  defaultReviewerId: "",
                                }));
                            }}
                          >
                            {Object.entries(WORKSTREAMS).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div className="two-fields">
                        <label className="field">
                          Name
                          <input
                            required
                            aria-label={`Member ${i + 1} name`}
                            maxLength={60}
                            value={m.name}
                            onChange={(e) =>
                              update(m.id, { name: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          GitHub username (optional)
                          <input
                            pattern="[a-zA-Z0-9-]+"
                            aria-label={`Member ${i + 1} GitHub username`}
                            value={m.login}
                            onChange={(e) =>
                              update(m.id, { login: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="text-button"
                        disabled={
                          m.kind === "canvas" ||
                          (!!m.workstream && m.workstream !== "code")
                        }
                        onClick={() =>
                          setValue((v) => ({
                            ...v,
                            assignmentMode: "automatic",
                            defaultReviewerId: m.id,
                            members: v.members.map((n) => ({
                              ...n,
                              receivesReviews: n.id === m.id,
                            })),
                          }))
                        }
                      >
                        Make sole code reviewer
                      </button>
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={isCodeReviewer(m)}
                          disabled={
                            m.kind === "canvas" ||
                            (!!m.workstream && m.workstream !== "code")
                          }
                          onChange={(e) =>
                            update(m.id, { receivesReviews: e.target.checked })
                          }
                        />{" "}
                        Receives code reviews
                      </label>
                      <label className="field">
                        Current task
                        <input
                          maxLength={120}
                          aria-label={`Member ${i + 1} task`}
                          value={m.focus}
                          onChange={(e) =>
                            update(m.id, { focus: e.target.value })
                          }
                        />
                      </label>
                      <label className="field role-field">
                        Role
                        <input
                          maxLength={80}
                          aria-label={`Member ${i + 1} role`}
                          value={m.role}
                          onChange={(e) =>
                            update(m.id, { role: e.target.value })
                          }
                        />
                      </label>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </fieldset>
            </div>
          </div>
        </div>
        <div className="setup-note" hidden={tab !== "repository"}>
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
        <div className="management-savebar">
          <span role="status">
            {canEdit
              ? dirty
                ? "Unsaved changes"
                : "All settings saved"
              : "Only the team creator can edit settings"}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setValue({
                ...settings,
                name: settings.name || "Hackathon workspace",
              });
              setError("");
            }}
          >
            Reset changes
          </button>
          {canEdit && (
            <button className="primary" disabled={busy || !dirty}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
