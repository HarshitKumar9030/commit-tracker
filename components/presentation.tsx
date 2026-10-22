"use client";
import { useState } from "react";
import { ArrowUpRight, Copy, Check, Download, FileText } from "lucide-react";
import type { Workspace } from "@/lib/types";
export default function Presentation({ data }: { data: Workspace }) {
  const [copied, setCopied] = useState(false);
  const approved = data.commits.filter((c) => c.review?.verdict === "approved");
  const indexed = (data.codeIndex || []).filter((r) =>
    data.commits.some((c) => c.sha === r.sha),
  );
  const text = `# ${data.settings.repo.split("/")[1]}\n\n## What we built\n${data.commits.map((c) => `- ${c.title} (${c.author})`).join("\n")}\n\n## Code index\n${indexed.map((r) => `### ${r.sha.slice(0, 7)} ${r.summary}\n${r.notes}\n${r.symbols.map((s) => `- ${s.change}: ${s.kind} ${s.name} (${s.file})`).join("\n")}`).join("\n\n") || "Code index notes are still in progress."}\n\n## Reviewed & ready\n${approved.map((c) => `- ${c.title}: ${c.review!.note}`).join("\n") || "Reviews are still in progress."}\n\n## The team\n${data.settings.members
    .filter((m) => m.kind !== "canvas")
    .map((m) => `- ${m.name} (${m.role}): ${m.focus}`)
    .join("\n")}`;

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
              await navigator.clipboard.writeText(text);
              setCopied(true);
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
            <a
              aria-label={`Open ${c.title} on GitHub`}
              href={c.url}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowUpRight size={19} />
            </a>
          </article>
        ))}
      </div>
      <div className="story-section">
        <span className="section-number">CODE INDEX</span>
        <h2>Documented changes</h2>
        <p>
          Syed’s notes explain how the code works and what each change adds.
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
