import { WORKSTREAMS } from "@/lib/workflow";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Workspace } from "@/lib/types";
import { Avatar } from "./primitives";
export default function TeamView({
  data,
  online,
  userId,
  onFocus,
  onManage,
}: {
  data: Workspace;
  online: string[];
  userId: string;
  onFocus: (focus: string) => void;
  onManage: () => void;
}) {
  const pending = data.commits.filter((c) => !c.review);
  return (
    <>
      <div className="team-tools">
        <button className="primary" onClick={onManage}>
          Manage members
        </button>
      </div>
      <section className="team-grid">
        {data.settings.members.map((m, i) => (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            whileHover={{ y: -3 }}
            className="team-card"
            key={m.id}
          >
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
            {m.workstream && (
              <span className="workstream-label">
                {WORKSTREAMS[m.workstream]}
              </span>
            )}
            <p className="muted">
              {m.kind === "canvas"
                ? "Canvas User · live drawing"
                : m.receivesReviews === false
                  ? "No code reviews"
                  : "Code reviewer"}
            </p>
            <div className="focus-label">CURRENT TASK</div>
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
                Update task <ArrowRight size={14} />
              </button>
            )}
          </motion.article>
        ))}
      </section>
    </>
  );
}
