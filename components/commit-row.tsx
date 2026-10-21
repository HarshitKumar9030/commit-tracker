import { motion } from "framer-motion";
import { Check, GitBranch } from "lucide-react";
import type { Commit, Member } from "@/lib/types";
import { Avatar, Status, relativeDate } from "./primitives";
export default function CommitRow({
  c,
  members,
  onSelect,
}: {
  c: Commit;
  members: Member[];
  onSelect: (commit: Commit) => void;
}) {
  const author = members.find(
    (m) => m.login.toLowerCase() === c.author.toLowerCase(),
  );
  const assignee = members.find((m) => m.id === c.assignee) || {
    id: "former",
    name: "Unassigned",
    login: "",
    role: "",
    focus: "",
    color: "purple",
  };
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.22 }}
      className="commit-row"
      key={c.sha}
      onClick={() => onSelect(c)}
    >
      <div
        className={`commit-node ${c.review?.verdict === "approved" ? "done" : ""}`}
      >
        {c.review?.verdict === "approved" ? <Check size={13} /> : <span />}
      </div>
      <div className="commit-content">
        <div className="commit-row-title">
          <h3>{c.title}</h3>
          <span className="commit-time">{relativeDate(c.date)}</span>
        </div>
        <div className="commit-meta">
          <span className="author">
            {author?.name.split(" ")[0] || c.author}
          </span>
          <span>·</span>
          <code>{c.sha.slice(0, 7)}</code>
          <span>·</span>
          <span className="branch">
            <GitBranch size={12} />
            {c.branch}
          </span>
        </div>
        <div className="commit-bottom">
          <div className="file-stats">
            <span>
              {c.files.length} {c.files.length === 1 ? "file" : "files"} changed
            </span>
            <span className="add">+{c.additions}</span>
            <span className="remove">−{c.deletions}</span>
          </div>
          <div className="commit-review">
            <Status commit={c} />
            <span className="assigned-to">for</span>
            <Avatar member={assignee} small />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
