"use client";
import MarkdownNotes from "./markdown-notes";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Check,
  FileCode2,
  Copy,
  ArrowUpRight,
} from "lucide-react";
import {
  canMaintainIndex,
  indexCommit,
  type CodeIndexRecord,
} from "@/lib/code-index";
import type { Commit, Member, Workspace } from "@/lib/types";
type Draft = { summary: string; notes: string };
export default function CodeIndex({
  data,
  user,
  onSave,
  onOpenCommit,
  onDemoProfile,
}: {
  data: Workspace;
  user: Member;
  onSave: (sha: string, summary: string, notes: string) => Promise<void>;
  onOpenCommit: (commit: Commit) => void;
  onDemoProfile: () => void;
}) {
  const [notesView, setNotesView] = useState<"write" | "preview" | null>(null);
  const [selected, setSelected] = useState(
      data.mode === "demo" ? data.codeIndex?.[0]?.sha || "" : "",
    ),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const maintainer =
    data.settings.members.find((m) => m.workstream === "index")?.name ||
    "The code-index maintainer";
  const records = new Map((data.codeIndex || []).map((r) => [r.sha, r])),
    editable = canMaintainIndex(user, data.settings.ownerId);
  const indexes = useMemo(
    () => new Map(data.commits.map((c) => [c.sha, indexCommit(c)])),
    [data.commits],
  );
  const visible = data.commits.filter(
    (c) =>
      (filter === "all" ||
        (filter === "pending" ? !records.has(c.sha) : records.has(c.sha))) &&
      `${c.title} ${c.sha} ${c.files.map((f) => f.filename).join(" ")} ${(indexes.get(c.sha) || []).map((s) => s.name).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const commit = visible.find((c) => c.sha === selected) || visible[0],
    record = commit ? records.get(commit.sha) : undefined,
    symbols = commit ? indexes.get(commit.sha) || [] : [],
    draft = commit
      ? drafts[commit.sha] || {
          summary: record?.summary || commit.title,
          notes: record?.notes || "",
        }
      : { summary: "", notes: "" };
  function change(patch: Partial<Draft>) {
    if (commit)
      setDrafts((state) => ({
        ...state,
        [commit.sha]: { ...draft, ...patch },
      }));
  }
  async function copy() {
    if (!commit) return;
    try {
      await navigator.clipboard.writeText(
        `# ${commit.sha.slice(0, 7)} ${record?.summary || commit.title}\n\n${record?.notes || "Not documented yet."}\n\n${symbols.map((s) => `- ${s.change}: ${s.kind} ${s.name} (${s.file})`).join("\n")}`,
      );
      setStatus("Index record copied.");
    } catch {
      setStatus("Clipboard unavailable.");
    }
  }
  return (
    <section className="code-index">
      <div className="index-intro">
        <div>
          <span className="eyebrow">CODE REFERENCE</span>
          <h2>What changed in the code</h2>
          <p>
            {maintainer} keeps the commit notes, functions, and components
            organized here. The whole team can read them.
          </p>
        </div>
        <BookOpen size={29} />
      </div>
      {data.mode === "demo" && (
        <div className="demo-workflow-guide">
          <div>
            <strong>Try the code-index workflow</strong>
            <p>
              These sample diffs contain different functions and components.
              Read a documented example, then select “Needs documentation” to
              add notes for the presence change. Saved notes appear in
              Presentation. Sample diffs are illustrative.
            </p>
          </div>
          <div className="action-row">
            <button
              className="secondary"
              onClick={() => {
                setFilter("documented");
                setSelected("");
              }}
            >
              Read an example
            </button>
            <button
              className="primary"
              onClick={() => {
                onDemoProfile();
                setFilter("pending");
                setSelected("");
              }}
            >
              Try as {maintainer}
            </button>
          </div>
        </div>
      )}
      <div className="index-stats">
        <div>
          <strong>{data.commits.length}</strong>
          <span>Commits tracked</span>
        </div>
        <div>
          <strong>
            {data.commits.filter((c) => records.has(c.sha)).length}
          </strong>
          <span>Documented</span>
        </div>
        <div>
          <strong>
            {[...indexes.values()].reduce((n, s) => n + s.length, 0)}
          </strong>
          <span>Symbol changes detected</span>
        </div>
      </div>
      <div className="index-filters">
        <label className="index-search">
          <Search size={16} />
          <input
            aria-label="Search code index"
            placeholder="Search commits, files, or functions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter code index"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All commits</option>
          <option value="pending">Needs documentation</option>
          <option value="documented">Documented</option>
        </select>
      </div>
      <div className="index-layout">
        <div className="index-commit-list" aria-label="Indexed commits">
          {visible.map((c) => (
            <button
              key={c.sha}
              className={c.sha === commit?.sha ? "selected" : ""}
              onClick={() => {
                setSelected(c.sha);
                setNotesView(null);
                setStatus("");
              }}
            >
              <span className="index-commit-sha">
                {c.sha.slice(0, 7)}
                <span
                  className={
                    records.has(c.sha) ? "index-done" : "index-pending"
                  }
                >
                  {records.has(c.sha) ? "Documented" : "Needs notes"}
                </span>
              </span>
              <strong>{c.title}</strong>
              <span>
                {c.author} · {c.files.length} files ·{" "}
                {(indexes.get(c.sha) || []).length} symbols
              </span>
            </button>
          ))}
          {!visible.length && (
            <p className="muted">
              {data.commits.length
                ? "No commits match this filter."
                : "Sync repository commits to start the code index."}
            </p>
          )}
        </div>
        {commit && (
          <article className="index-detail">
            <div className="index-detail-title">
              <div>
                <code>{commit.sha.slice(0, 7)}</code>
                <h3>{commit.title}</h3>
              </div>
              <button
                className="secondary"
                onClick={() => onOpenCommit(commit)}
              >
                <FileCode2 size={15} />
                Open diff
              </button>
            </div>
            <div className="index-files">
              {commit.files.map((f) =>
                data.mode === "demo" ? (
                  <span key={f.filename} className="sample-file">
                    {f.filename}
                  </span>
                ) : (
                  <a
                    key={f.filename}
                    href={`https://github.com/${data.settings.repo}/blob/${commit.sha}/${f.filename.split("/").map(encodeURIComponent).join("/")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.filename}
                    <ArrowUpRight size={12} />
                  </a>
                ),
              )}
            </div>
            <h4>Functions & components</h4>
            <p className="index-detection-note">
              Detected from declarations visible in the diff. Body-only changes,
              multiline declarations, and omitted patches may need manual notes.
            </p>
            {symbols.length ? (
              <div className="index-symbols">
                {symbols.map((s) => (
                  <div key={`${s.file}:${s.kind}:${s.name}`}>
                    <span className={`symbol-change ${s.change}`}>
                      {s.change}
                    </span>
                    <div>
                      <code>{s.name}</code>
                      <small>
                        {s.kind} · {s.file}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                No declaration changes detected. Check the diff and document the
                behavior or structure changes below.
              </p>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setStatus("");
                try {
                  await onSave(commit.sha, draft.summary, draft.notes);
                  setDrafts((state) => {
                    const next = { ...state };
                    delete next[commit.sha];
                    return next;
                  });
                  setStatus("Index record saved.");
                } catch (error) {
                  setStatus((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Change summary
                <input
                  aria-label="Code index summary"
                  maxLength={240}
                  required
                  readOnly={!editable}
                  value={draft.summary}
                  onChange={(e) => change({ summary: e.target.value })}
                />
              </label>
              <div className="notes-editor">
                <div className="notes-editor-top">
                  <span id="code-notes-label">
                    Code structure & behavior notes
                  </span>
                  {editable && (
                    <div
                      className="notes-view-controls"
                      role="group"
                      aria-label="Notes view"
                    >
                      {(["write", "preview"] as const).map((view) => (
                        <button
                          type="button"
                          key={view}
                          aria-pressed={
                            (notesView || (record ? "preview" : "write")) ===
                            view
                          }
                          onClick={() => setNotesView(view)}
                        >
                          {view === "write" ? "Write" : "Preview"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  aria-label="Code structure notes"
                  aria-describedby="code-notes-help"
                  required
                  readOnly={!editable}
                  hidden={
                    !editable ||
                    (notesView || (record ? "preview" : "write")) === "preview"
                  }
                  maxLength={4000}
                  value={draft.notes}
                  onChange={(e) => change({ notes: e.target.value })}
                  placeholder="## What changed\nExplain functions, components, and behavior. Use **bold**, lists, and fenced code blocks."
                />
                {(!editable ||
                  (notesView || (record ? "preview" : "write")) ===
                    "preview") && (
                  <div
                    className="notes-preview"
                    role="region"
                    aria-labelledby="code-notes-label"
                  >
                    {draft.notes.trim() ? (
                      <MarkdownNotes text={draft.notes} />
                    ) : (
                      <p className="muted">
                        Write some notes to preview them here.
                      </p>
                    )}
                  </div>
                )}
                <p id="code-notes-help" className="notes-help">
                  Markdown supported: headings, lists, links, tables, and fenced
                  code blocks. Preview shows your unsaved edits.
                </p>
              </div>
              {record && (
                <p className="muted">
                  Documented by{" "}
                  {data.settings.members.find((m) => m.id === record.indexedBy)
                    ?.name || "a teammate"}{" "}
                  · {new Date(record.updatedAt).toLocaleString()}
                </p>
              )}
              <div className="index-save-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => void copy()}
                >
                  <Copy size={14} />
                  Copy record
                </button>
                {editable ? (
                  <button
                    className="primary"
                    disabled={
                      busy || !draft.notes.trim() || !draft.summary.trim()
                    }
                  >
                    <Check size={15} />
                    {busy
                      ? "Saving…"
                      : record
                        ? "Update record"
                        : "Save index record"}
                  </button>
                ) : (
                  <p className="muted">
                    {maintainer} and the team creator can update these notes.
                  </p>
                )}
              </div>
              {status && (
                <p role="status" className="muted">
                  {status}
                </p>
              )}
            </form>
          </article>
        )}
      </div>
    </section>
  );
}
