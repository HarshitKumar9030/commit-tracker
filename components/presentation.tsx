"use client";
import { useState } from "react";
import { ArrowUpRight, Copy, Check, Download, Sparkles } from "lucide-react";
import type { Workspace } from "@/lib/types";
export default function Presentation({ data }: { data: Workspace }) {
  const [copied, setCopied] = useState(false);
  const approved = data.commits.filter((c) => c.review?.verdict === "approved");
  const text = `# ${data.settings.repo.split("/")[1]}\n\n## What we built\n${data.commits.map((c) => `- ${c.title} (${c.author})`).join("\n")}\n\n## Reviewed & ready\n${approved.map((c) => `- ${c.title}: ${c.review!.note}`).join("\n") || "Reviews are still in progress."}\n\n## The team\n${data.settings.members.map((m) => `- ${m.name}: ${m.focus}`).join("\n")}`;
  return (
    <section className="presentation">
      <div className="presentation-top">
        <div>
          <Sparkles size={24} />
          <h2>Project summary</h2>
          <p>Copy or export the latest commits and approved review notes.</p>
        </div>
        <div className="action-row">
          <button
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
          {data.settings.members.length}.
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
