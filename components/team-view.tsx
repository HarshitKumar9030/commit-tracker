import { ArrowRight } from "lucide-react";
import type { Workspace } from "@/lib/types";
import { Avatar } from "./primitives";
export default function TeamView({
  data,
  online,
  userId,
  onFocus,
}: {
  data: Workspace;
  online: string[];
  userId: string;
  onFocus: (focus: string) => void;
}) {
  const pending = data.commits.filter((c) => !c.review);
  return (
    <section className="team-grid">
      {data.settings.members.map((m) => (
        <article className="team-card" key={m.id}>
          <div className="team-card-top">
            <Avatar member={m} />
            <span
              className={`presence-label ${online.includes(m.id) ? "is-online" : ""}`}
            >
              <span />
              {data.mode === "demo"
                ? "Demo profile"
                : online.includes(m.id)
                  ? "Online now"
                  : "Offline"}
            </span>
          </div>
          <h2>{m.name}</h2>
          <p>{m.role}</p>
          <div className="focus-label">CURRENT FOCUS</div>
          <h3>{m.focus}</h3>
          <div className="team-card-stats">
            <span>
              {
                data.commits.filter(
                  (c) => c.author.toLowerCase() === m.login.toLowerCase(),
                ).length
              }{" "}
              commits
            </span>
            <span>
              {pending.filter((c) => c.assignee === m.id).length} pending
              reviews
            </span>
          </div>
          {m.id === userId && (
            <button className="text-button" onClick={() => onFocus(m.focus)}>
              Update your focus <ArrowRight size={14} />
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
