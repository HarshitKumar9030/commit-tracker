"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Square, BarChart3, MessageSquare, Copy } from "lucide-react";
import type { Workspace } from "@/lib/types";
type Message = { role: "user" | "assistant"; content: string };
export default function AIPanel({ data }: { data: Workspace }) {
  const [tab, setTab] = useState<"chat" | "analytics">("analytics"),
    [question, setQuestion] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [analysis, setAnalysis] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selectedSha, setSelectedSha] = useState(""),
    [cached, setCached] = useState(false);
  const [usage, setUsage] = useState<{
    requests: number;
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  async function loadUsage() {
    if (data.mode === "live")
      try {
        const r = await fetch("/api/ai");
        if (r.ok) setUsage(await r.json());
      } catch {}
  }
  useEffect(() => {
    void loadUsage();
  }, [data.settings.teamId]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function run() {
    if (busy) return;
    setBusy(true);
    setError("");
    setCached(false);
    const kind = tab,
      q = question.trim(),
      previous = messages.slice(-6);
    if (kind === "chat") {
      if (!q) {
        setBusy(false);
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "user", content: q },
        { role: "assistant", content: "" },
      ]);
      setQuestion("");
    } else setAnalysis("");
    controller.current = new AbortController();
    try {
      if (data.mode === "demo") {
        const text =
          kind === "analytics"
            ? `## Review queue\n${data.commits.filter((c) => !c.review).length} commits need review. ${data.commits.filter((c) => !c.assignee && !c.review).length} are unassigned.\n\n## Next actions\nChoose code reviewers in **Team settings**, then open a commit to inspect its diff.\n\n*Demo preview. No AI request was made.*`
            : "This is the demo preview. In a live team, I can summarize commits, explain selected diffs, and help plan review work.\n\n*No AI request was made.*";
        if (kind === "analytics") setAnalysis(text);
        else
          setMessages((m) => [
            ...m.slice(0, -1),
            { role: "assistant", content: text },
          ]);
        return;
      }
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          question: q,
          history: kind === "chat" ? previous : [],
          selectedSha: selectedSha || undefined,
        }),
        signal: controller.current.signal,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "AI request failed.");
      }
      setCached(response.headers.get("X-AI-Cache") === "hit");
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (kind === "analytics") setAnalysis(text);
        else
          setMessages((m) => [
            ...m.slice(0, -1),
            { role: "assistant", content: text },
          ]);
      }
      if (!text.trim())
        throw new Error(
          "No response received. Check AI credentials and credits, then retry.",
        );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
      void loadUsage();
      controller.current = null;
    }
  }
  return (
    <section className="ai-panel">
      <div className="ai-top">
        <div>
          <span className="eyebrow">PROJECT ASSISTANT</span>
          <h2>Analytics & chat</h2>
          <p className="muted">
            Gemini 3.8 Flash · Responses use a limited repository snapshot.
          </p>
        </div>
        <div className="segmented">
          <button
            className={tab === "analytics" ? "selected" : ""}
            disabled={busy}
            onClick={() => setTab("analytics")}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button
            className={tab === "chat" ? "selected" : ""}
            disabled={busy}
            onClick={() => setTab("chat")}
          >
            <MessageSquare size={16} />
            Chat
          </button>
        </div>
      </div>
      <div className="ai-stats">
        <div>
          <strong>{data.commits.filter((c) => !c.review).length}</strong>
          <span>Pending reviews</span>
        </div>
        <div>
          <strong>
            {data.commits.filter((c) => !c.review && !c.assignee).length}
          </strong>
          <span>Unassigned</span>
        </div>
        <div>
          <strong>
            {
              data.settings.members.filter((m) => m.receivesReviews !== false)
                .length
            }
          </strong>
          <span>Code reviewers</span>
        </div>
      </div>
      {usage && (
        <p className="muted">
          Team usage today (UTC): {usage.requests} responses ·{" "}
          {usage.inputTokens.toLocaleString()} input tokens ·{" "}
          {usage.outputTokens.toLocaleString()} output tokens
        </p>
      )}
      <p className="ai-budget">
        Runs only when requested. Up to 20 recent commit summaries, 6 chat
        messages, and 1,200 output tokens per request. Analytics cached for 15
        minutes when context matches. 20 requests per member per hour.
      </p>
      {tab === "analytics" ? (
        <>
          <button className="primary" disabled={busy} onClick={run}>
            {busy ? "Analyzing…" : "Analyze project"}
          </button>
          {cached && (
            <span className="muted"> Cached result · no new model call</span>
          )}
          <Markdown text={analysis} />
        </>
      ) : (
        <>
          <div className="ai-messages" aria-live="polite">
            {!messages.length && (
              <p className="muted">
                Ask what changed, what needs review, or what belongs in the
                presentation.
              </p>
            )}
            {messages.map((m, i) => (
              <article key={i} className={`ai-message ${m.role}`}>
                <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
                <Markdown text={m.content} />
              </article>
            ))}
          </div>
          <label className="field">
            Include a commit diff (optional)
            <select
              value={selectedSha}
              onChange={(e) => setSelectedSha(e.target.value)}
            >
              <option value="">Summaries only · fewer tokens</option>
              {data.commits.map((c) => (
                <option key={c.sha} value={c.sha}>
                  {c.sha.slice(0, 7)} · {c.title}
                </option>
              ))}
            </select>
            <small>
              Selected diff is capped at four files and 1,800 characters per
              file.
            </small>
          </label>
          <form
            className="ai-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
          >
            <textarea
              aria-label="Ask the project assistant"
              placeholder="Ask about this project…"
              maxLength={1500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="primary" disabled={busy || !question.trim()}>
              <Send size={16} />
              Send
            </button>
          </form>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setMessages([])}
          >
            Clear chat
          </button>
          <p className="muted">
            Chat stays in this view and is cleared when you leave. AI responses
            can be incomplete; verify against the diff.
          </p>
        </>
      )}
      {busy && (
        <button
          className="secondary"
          onClick={() => controller.current?.abort()}
        >
          <Square size={14} />
          Stop response
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
function Markdown({ text }: { text: string }) {
  return text ? (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: () => null,
        }}
      >
        {text}
      </ReactMarkdown>
      <button
        className="text-button"
        onClick={() => {
          void navigator.clipboard.writeText(text).catch(() => {});
        }}
        data-tooltip="Copy response as Markdown"
      >
        <Copy size={13} />
        Copy Markdown
      </button>
    </div>
  ) : null;
}
