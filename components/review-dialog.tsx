"use client";
import { formatDiff } from "@/lib/diff";
import { useState } from "react";
import {
  ExternalLink,
  FileCode2,
  GitBranch,
  Check,
  MessageCircle,
} from "lucide-react";
import type { Commit, Member, Review } from "@/lib/types";
import { Modal, Status, Avatar } from "./primitives";
export default function ReviewDialog({
  commit,
  members,
  userId,
  onReview,
  onAssign,
  allowSelfReview,
  close,
}: {
  onAssign: (id:string) => Promise<void>;
  allowSelfReview?: boolean;
  commit: Commit;
  members: Member[];
  userId: string;
  onReview: (
    sha: string,
    verdict: Review["verdict"],
    note: string,
  ) => Promise<void>;
  close: () => void;
}) {
  const [file, setFile] = useState(0),
    [note, setNote] = useState(commit.review?.note || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const assignee = members.find((m) => m.id === commit.assignee) || {
    id: "former",
    name: "Unassigned",
    login: "",
    role: "",
    focus: "",
    color: "purple",
  };
  async function submit(verdict: Review["verdict"]) {
    if (!note.trim()) {
      setError("Enter a review note before submitting.");
      return;
    }
    setBusy(true);
    try {
      await onReview(commit.sha, verdict, note);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Commit diff" close={close} wide>
      <div className="review-heading">
        <Status commit={commit} />
        <h2>{commit.title}</h2>
        <p>
          {commit.author} <span>committed to</span> <GitBranch size={13} />{" "}
          {commit.branch} · {commit.sha.slice(0, 7)}{" "}
          <a
            href={commit.url}
            target="_blank"
            rel="noreferrer"
            aria-label="View commit on GitHub"
          >
            <ExternalLink size={15} />
          </a>
        </p>
        {commit.body && <p className="commit-body">{commit.body}</p>}
      </div>
      <div className="diff-meta">
        <span>{commit.files.length} changed files</span>
        <span className="add">+{commit.additions}</span>
        <span className="remove">−{commit.deletions}</span>
      </div>
      <div className="diff-actions">
        <button className="secondary" onClick={async () => {try {await navigator.clipboard.writeText(formatDiff(commit.files.slice(file,file+1)));setError("File diff copied.");} catch {setError("Clipboard unavailable.");}}}>Copy file diff</button>
        <button className="secondary" onClick={async () => {try {await navigator.clipboard.writeText(formatDiff(commit.files));setError("All available diffs copied.");} catch {setError("Clipboard unavailable.");}}}>Copy all diffs</button>
        <button className="secondary" onClick={() => {const url=URL.createObjectURL(new Blob([formatDiff(commit.files)],{type:"text/plain"})); const a=document.createElement("a");a.href=url;a.download=`${commit.sha.slice(0,7)}.diff`;a.click();URL.revokeObjectURL(url);}}>Download diff</button>
      </div>
      <div className="file-tabs">
        {commit.files.map((f, i) => (
          <button
            key={f.filename}
            className={file === i ? "selected" : ""}
            onClick={() => setFile(i)}
          >
            <FileCode2 size={14} />
            {f.filename}
          </button>
        ))}
      </div>
      <div className="diff" aria-label="Code diff">
        {commit.files[file]?.patch ? (
          commit.files[file].patch!.split("\n").map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("+")
                  ? "line-added"
                  : line.startsWith("-")
                    ? "line-removed"
                    : line.startsWith("@@")
                      ? "line-hunk"
                      : ""
              }
            >
              <span className="line-number">{i + 1}</span>
              <code>{line || " "}</code>
            </div>
          ))
        ) : (
          <p>
            GitHub did not include a text patch for this file. Binary and large
            diffs can be viewed on GitHub.
          </p>
        )}
      </div>
      <div className="review-assignment">
        <Avatar member={assignee} small />
        <span>
          Assigned to <strong>{assignee.name}</strong>
        </span>
      </div>
      {!commit.review && <label className="field">Assign code reviewer
        <select aria-label="Assign code reviewer" value={commit.assignee} disabled={busy} onChange={async e => {setBusy(true);try {await onAssign(e.target.value);setError("");}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
          <option value="">Unassigned</option>
          {members.filter(m => m.receivesReviews !== false && (allowSelfReview || m.login.toLowerCase() !== commit.author.toLowerCase())).map(m => <option key={m.id} value={m.id}>{m.name}{m.login.toLowerCase() === commit.author.toLowerCase() ? " (self-review)" : ""}</option>)}
        </select>
      </label>}
      {error && <p role="status" className="muted">{error}</p>}
      {commit.review && (
        <div className="review-note">
          <strong>
            {commit.review.verdict === "approved"
              ? "Approved"
              : "Changes requested"}
          </strong>
          <p>{commit.review.note}</p>
        </div>
      )}
      {userId === commit.assignee ? (
        <>
          <label className="field">
            Your review
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed? What should the team know?"
              maxLength={2000}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              data-tooltip="Record requested changes with feedback for the team."
              className="secondary"
              disabled={busy}
              onClick={() => submit("changes")}
            >
              <MessageCircle size={15} />
              Request changes
            </button>
            <button
              data-tooltip="Save an approval and your note to the team workspace. This does not merge code on GitHub."
              className="primary"
              disabled={busy}
              onClick={() => submit("approved")}
            >
              <Check size={16} />
              {busy ? "Saving…" : "Approve changes"}
            </button>
          </div>
        </>
      ) : (
        <p className="muted">
          Only the assigned code reviewer can submit a review.
        </p>
      )}
    </Modal>
  );
}
