"use client";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  Link2,
  Pin,
  Plus,
  Search,
  X,
  RotateCcw,
} from "lucide-react";
import {
  FILE_CATEGORIES,
  parseDriveLink,
  canManageFile,
  type TeamFile,
} from "@/lib/team-files";
import type { Workspace, Member } from "@/lib/types";
import MarkdownNotes from "./markdown-notes";
export type FileAction =
  | {
      action: "add";
      url: string;
      title: string;
      description: string;
      category: TeamFile["category"];
    }
  | {
      action: "update";
      id: string;
      title: string;
      description: string;
      category: TeamFile["category"];
      pinned: boolean;
    }
  | { action: "archive"; id: string }
  | { action: "restore"; id: string };
const blank = {
  url: "",
  title: "",
  description: "",
  category: "general" as TeamFile["category"],
};
export default function TeamFiles({
  data,
  user,
  onAction,
}: {
  data: Workspace;
  user: Member;
  onAction: (action: FileAction) => Promise<void>;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [archived, setArchived] = useState(false),
    [editing, setEditing] = useState<TeamFile | null>(null),
    [form, setForm] = useState(blank),
    [adding, setAdding] = useState(false),
    [preview, setPreview] = useState<TeamFile | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const previewRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (preview) {
      previewRef.current?.scrollIntoView({ block: "start" });
      previewRef.current?.focus({ preventScroll: true });
    }
  }, [preview?.id]);
  useEffect(() => {
    if (adding || editing) formRef.current?.scrollIntoView({ block: "start" });
  }, [adding, editing?.id]);
  const files = data.files || [];
  const visible = files
    .filter(
      (f) =>
        !!f.archivedAt === archived &&
        (category === "all" || f.category === category) &&
        `${f.title} ${f.description} ${f.kind}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.addedAt.localeCompare(a.addedAt),
    );
  async function action(value: FileAction) {
    setBusy(true);
    setError("");
    try {
      await onAction(value);
      setStatus(
        value.action === "archive"
          ? "Entry archived. The file stays in Google Drive."
          : value.action === "restore"
            ? "File restored to the shared list."
            : "Shared files updated.",
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="team-files">
      <div className="files-hero">
        <div>
          <span className="eyebrow">GOOGLE DRIVE</span>
          <h2>The team’s shared files</h2>
          <p>
            Keep PDFs, documents, slides, and project folders together. Files
            stay in Drive; everyone sees the same shared list here.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setForm(blank);
            setError("");
          }}
        >
          <Plus size={16} />
          Share a Drive link
        </button>
      </div>
      {data.mode === "demo" && (
        <div className="demo-workflow-guide">
          <div>
            <strong>Try file sharing</strong>
            <p>
              Add a Drive sharing link to test the page. Demo entries stay in
              this browser. Live team entries are saved in MongoDB and synced to
              teammates.
            </p>
          </div>
        </div>
      )}
      <div className="files-access-note">
        <Folder size={18} />
        <p>
          For a shared upload space, add a Drive folder and give your teammates
          Editor access in Google Drive. Open that folder to upload PDFs, Word
          files, images, or anything else. Adding a link here does not change
          its Drive permissions.
        </p>
      </div>
      {(adding || editing) && (
        <form
          ref={formRef}
          className="files-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (!editing) parseDriveLink(form.url);
            } catch (e) {
              setError((e as Error).message);
              return;
            }
            const ok = await action(
              editing
                ? {
                    action: "update",
                    id: editing.id,
                    title: form.title,
                    description: form.description,
                    category: form.category,
                    pinned: editing.pinned,
                  }
                : { action: "add", ...form },
            );
            if (ok) {
              setAdding(false);
              setEditing(null);
              setForm(blank);
            }
          }}
        >
          <div className="files-form-heading">
            <h3>{editing ? "Edit shared entry" : "Share with the team"}</h3>
            <button
              type="button"
              className="icon-button"
              aria-label="Close file form"
              onClick={() => {
                setAdding(false);
                setEditing(null);
                setError("");
              }}
            >
              <X size={18} />
            </button>
          </div>
          {!editing && (
            <>
              <label className="field">
                Google Drive link
                <input
                  type="url"
                  required
                  maxLength={2000}
                  placeholder="https://drive.google.com/file/d/…/view"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </label>
            </>
          )}
          <div className="two-fields">
            <label className="field">
              File title
              <input
                required
                maxLength={120}
                placeholder="Architecture diagram.pdf"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="field">
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as TeamFile["category"],
                  })
                }
              >
                {Object.entries(FILE_CATEGORIES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Note for the team (optional)
            <textarea
              maxLength={1000}
              placeholder="What is this file for? Markdown is supported."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <p className="muted">
            Only the link and your description are stored in Relay. Confirm that
            your teammates have access in Drive.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save entry" : "Share file"}
          </button>
        </form>
      )}
      <div className="files-toolbar">
        <label className="index-search">
          <Search size={16} />
          <input
            aria-label="Search shared files"
            placeholder="Search files and notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter file category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {Object.entries(FILE_CATEGORIES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="secondary"
          aria-pressed={archived}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={15} />
          {archived ? "Show active files" : "Archived files"}
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="muted">
          {status}
        </p>
      )}
      <div className="shared-file-grid">
        {visible.map((file) => (
          <article className="shared-file-card" key={file.id}>
            <div className="shared-file-top">
              <span className={`file-kind ${file.kind}`}>
                {file.kind === "folder" ? (
                  <Folder size={23} />
                ) : (
                  <FileText size={23} />
                )}
              </span>
              <span>{FILE_CATEGORIES[file.category]}</span>
              {file.pinned && <Pin size={15} aria-label="Pinned" />}
            </div>
            <h3>{file.title}</h3>
            <small>
              {file.kind === "file" ? "Drive file" : file.kind} · Shared by{" "}
              {data.settings.members.find((m) => m.id === file.addedBy)?.name ||
                "a teammate"}
            </small>
            {file.description && <MarkdownNotes text={file.description} />}
            <div className="file-primary-actions">
              <button className="secondary" onClick={() => setPreview(file)}>
                Preview
              </button>
              <a
                className="secondary"
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {file.kind === "folder"
                  ? "Open folder / upload"
                  : "Open in Drive"}
                <ExternalLink size={13} />
              </a>
              <button
                className="icon-button"
                aria-label={`Copy link for ${file.title}`}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(file.url);
                    setStatus("Drive link copied.");
                  } catch {
                    setError(
                      "Clipboard unavailable. Open the file to copy its link.",
                    );
                  }
                }}
              >
                <Copy size={15} />
              </button>
            </div>
            {canManageFile(file, user.id, data.settings.ownerId) && (
              <div className="file-management-actions">
                {archived ? (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void action({ action: "restore", id: file.id })
                    }
                  >
                    <RotateCcw size={13} />
                    Restore entry
                  </button>
                ) : (
                  <>
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing(file);
                        setAdding(false);
                        setForm({
                          url: file.url,
                          title: file.title,
                          description: file.description,
                          category: file.category,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void action({
                          action: "update",
                          id: file.id,
                          title: file.title,
                          description: file.description,
                          category: file.category,
                          pinned: !file.pinned,
                        })
                      }
                    >
                      {file.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void action({ action: "archive", id: file.id })
                      }
                    >
                      Archive entry
                    </button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="files-empty">
          <Link2 size={32} />
          <h3>
            {search || category !== "all"
              ? "No matching files"
              : archived
                ? "No archived files"
                : "Share the first file"}
          </h3>
          <p>
            {archived
              ? "Archived entries can be restored here. Files in Drive are never deleted by Relay."
              : "Copy a file or folder link from Google Drive, then add it here for the team."}
          </p>
        </div>
      )}
      {preview && (
        <section
          ref={previewRef}
          tabIndex={-1}
          className="drive-preview-panel"
          aria-label={`Preview ${preview.title}`}
        >
          <div className="files-form-heading">
            <div>
              <span className="eyebrow">DRIVE PREVIEW</span>
              <h3>{preview.title}</h3>
            </div>
            <button
              className="icon-button"
              aria-label="Close Drive preview"
              onClick={() => setPreview(null)}
            >
              <X size={20} />
            </button>
          </div>
          <p className="muted">
            If Google asks you to sign in, blocks the embed, or says access
            denied, open the file in Drive with the account that has permission.
          </p>
          <a
            className="secondary"
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Drive <ExternalLink size={14} />
          </a>
          <iframe
            key={preview.id}
            title={`Google Drive preview: ${preview.title}`}
            src={preview.previewUrl}
            allow="fullscreen"
            referrerPolicy="no-referrer"
          />
        </section>
      )}
    </section>
  );
}
