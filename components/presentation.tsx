"use client";
import { useState } from "react";
import { ArrowUpRight, Copy, Check, Download, FileText } from "lucide-react";
import { presentationMarkdown, presentationOutline } from "@/lib/presentation";
import type { Workspace, Commit } from "@/lib/types";
export default function Presentation({
  data,
  navigate,
  onOpenCommit,
}: {
  data: Workspace;
  navigate: (page: string) => void;
  onOpenCommit: (commit: Commit) => void;
}) {
  const [rehearsal, setRehearsal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const outline = presentationOutline(data);
  const [copied, setCopied] = useState(false);
  const approved = data.commits.filter((c) => c.review?.verdict === "approved");
  const indexed = (data.codeIndex || []).filter((r) =>
    data.commits.some((c) => c.sha === r.sha),
  );
  const text = presentationMarkdown(data);

  return (
    <section className="presentation">
      <div className="presentation-top">
        <div>
          <FileText size={24} />
          <h2>Project summary</h2>
          <p>Copy or export the latest commits and approved review notes.</p>
        </div>
        <div className="action-row">
          <button
            data-tooltip="Copy commit descriptions, approved review notes, and team tasks to your clipboard."
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setError("Clipboard unavailable. Export the recap instead.");
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied" : "Copy recap"}
          </button>
          <button
            data-tooltip="Download a Markdown file for your hackathon presentation."
            className="primary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([text], { type: "text/markdown" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "relay-project-recap.md";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={16} />
            Export recap
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="demo-workflow-guide">
        <div>
          <strong>
            {data.mode === "demo"
              ? "Trisha’s sample presentation"
              : "Presentation walkthrough"}
          </strong>
          <p>
            {data.mode === "demo"
              ? "Saved code-index examples feed this recap. The sample diffs illustrate the workflow; they are not the connected repository’s history. Rehearse the outline, inspect the evidence, or export the full notes."
              : "Use the outline as a starting point. Check the code-index notes and review decisions before presenting."}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => setRehearsal(rehearsal === null ? 0 : null)}
        >
          {rehearsal === null ? "Rehearse walkthrough" : "Close rehearsal"}
        </button>
      </div>
      {rehearsal !== null ? (
        <section
          className="rehearsal-stage"
          aria-label="Presentation rehearsal"
        >
          <span className="eyebrow">
            PART {rehearsal + 1} OF {outline.length} · {outline[rehearsal].time}
          </span>
          <h2>{outline[rehearsal].title}</h2>
          <p>{outline[rehearsal].notes}</p>
          <small>{outline[rehearsal].evidence}</small>
          <div className="action-row">
            <button
              className="secondary"
              disabled={rehearsal === 0}
              onClick={() => setRehearsal(rehearsal - 1)}
            >
              Previous
            </button>
            <button
              className="primary"
              onClick={() =>
                rehearsal < outline.length - 1
                  ? setRehearsal(rehearsal + 1)
                  : setRehearsal(null)
              }
            >
              {rehearsal === outline.length - 1
                ? "Finish rehearsal"
                : "Next part"}
            </button>
          </div>
        </section>
      ) : (
        <div className="pitch-outline">
          {outline.map((beat) => (
            <article className="pitch-step" key={beat.title}>
              <span>{beat.time}</span>
              <h3>{beat.title}</h3>
              <p>{beat.notes}</p>
              <small>{beat.evidence}</small>
              <button
                className="text-button"
                onClick={() => navigate(beat.page)}
              >
                Open {beat.page.toLowerCase()} <ArrowUpRight size={13} />
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="story-section">
        <span className="section-number">COMMITS</span>
        <h2>Recent changes</h2>
        <p>
          {data.commits.length} commits from a team of{" "}
          {data.settings.members.filter((m) => m.kind !== "canvas").length}.
        </p>
        {data.commits.map((c) => (
          <article className="story-row" key={c.sha}>
            <span className="story-dot" />
            <div>
              <h3>{c.title}</h3>
              <p>{c.body || `Built by ${c.author}`}</p>
            </div>
            {data.mode === "demo" ? (
              <button
                className="icon-button"
                aria-label={`Open sample diff for ${c.title}`}
                onClick={() => onOpenCommit(c)}
              >
                <ArrowUpRight size={19} />
              </button>
            ) : (
              <a
                aria-label={`Open ${c.title} on GitHub`}
                href={c.url}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight size={19} />
              </a>
            )}
          </article>
        ))}
      </div>
      <div className="story-section">
        <span className="section-number">CODE INDEX</span>
        <h2>Documented changes</h2>
        <p>
          Saved maintainer notes explain how the code works and what each change
          adds.
        </p>
        {indexed.length ? (
          indexed.map((record) => (
            <article className="story-row" key={record.sha}>
              <span className="story-dot" />
              <div>
                <h3>{record.summary}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{record.notes}</p>
                <small>
                  {record.sha.slice(0, 7)} · {record.symbols.length} detected
                  symbol changes
                </small>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">
            Saved code-index notes will appear here for the presentation.
          </p>
        )}
      </div>
      <div className="story-section lavender">
        <span className="section-number">REVIEWS</span>
        <h2>Approved reviews</h2>
        <p>{approved.length} changes reviewed by a teammate.</p>
        {approved.map((c) => (
          <blockquote key={c.sha}>
            “{c.review!.note}”
            <footer>
              {data.settings.members.find((m) => m.id === c.review!.by)?.name} ·{" "}
              {c.title}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
