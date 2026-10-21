"use client";
import SignalMap from "./signal-map";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { X, GitCommitHorizontal, Check, MessageCircle } from "lucide-react";
import type { Member, Commit } from "@/lib/types";
export function Avatar({
  member,
  small = false,
}: {
  member: Member;
  small?: boolean;
}) {
  return (
    <span
      title={member.name}
      className={`avatar ${member.color} ${small ? "small" : ""}`}
    >
      {member.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Status({ commit }: { commit: Commit }) {
  return (
    <span
      className={`status ${commit.review?.verdict === "approved" ? "approved" : commit.review ? "changes" : "pending"}`}
    >
      {commit.review?.verdict === "approved" ? (
        <Check size={12} />
      ) : commit.review ? (
        <MessageCircle size={12} />
      ) : (
        <span className="mini-dot" />
      )}
      {!commit.assignee
        ? "Unassigned"
        : commit.review?.verdict === "approved"
          ? "Reviewed"
          : commit.review
            ? "Changes requested"
            : "Needs review"}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = ref.current!;
    const query =
      'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]';
    (element.querySelector(query) as HTMLElement)?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key === "Tab") {
        const items = Array.from(element.querySelectorAll<HTMLElement>(query));
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="modal-backdrop"
      onClick={close}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <SignalMap compact />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function relativeDate(value: string) {
  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  return mins < 60
    ? `${mins}m ago`
    : mins < 1440
      ? `${Math.floor(mins / 60)}h ago`
      : `${Math.floor(mins / 1440)}d ago`;
}
