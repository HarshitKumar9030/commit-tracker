"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowLeft, BookOpen, X, Check } from "lucide-react";
import { Modal } from "./primitives";
import SignalMap from "./signal-map";
const steps = [
  {
    page: "Commit feed",
    target: ".metrics",
    title: "Workspace totals",
    text: "These counts show imported commits, pending reviews, approved reviews, and members. Click a count to filter the list.",
  },
  {
    page: "Commit feed",
    target: ".commit-list",
    title: "Inspect a commit",
    text: "Click any commit to view its changed files and code diff. Green lines are additions; red lines are removals.",
  },
  {
    page: "My reviews",
    target: ".feed-column",
    title: "Your review queue",
    text: "New commits are assigned to another member. Only the assigned reviewer can approve or request changes. In the demo, switch profiles from the top-right avatar to try a review.",
  },
  {
    page: "Commit feed",
    target: ".team-panel",
    title: "Presence and current tasks",
    text: "In a live workspace, a green dot means the member is connected over WebSockets. Demo profiles are offline examples. Click your own profile to update your task.",
  },
  {
    page: "Team management",
    target: ".management-tabs",
    title: "Manage team members",
    text: "Use the full team management page to edit members, choose review routing, and copy repository invites. Each section has its own tab.",
  },
  {
    page: "Code index",
    target: ".index-layout",
    title: "Read the code reference",
    text: "Five sample changes have maintainer notes explaining functions, components, and their purpose. Try as Syed to document the remaining change. Saved notes feed the presentation.",
  },
  {
    page: "Presentation",
    target: ".presentation-top",
    title: "Export a project recap",
    text: "Rehearse a three-minute walkthrough with source evidence, then copy or export the commit descriptions, code-index notes, and approved reviews as Markdown.",
  },
];
type Rect = { x: number; y: number; width: number; height: number };
export default function DemoTour({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const [step, setStep] = useState<number | null>(null),
    [rect, setRect] = useState<Rect | null>(null),
    [ready, setReady] = useState(false);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const reduce = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      if (!localStorage.getItem("relay-demo-tour-v1")) setStep(-1);
    } catch {
      setStep(-1);
    }
    setReady(true);
  }, []);
  const finish = () => {
    try {
      localStorage.setItem("relay-demo-tour-v1", "done");
    } catch {}
    setStep(null);
    setRect(null);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(".demo-banner button")?.focus(),
    );
  };
  useEffect(() => {
    if (step === null || step < 0) return;
    setRect(null);
    navigateRef.current(steps[step].page);
    let frame = 0,
      count = 0;
    let element: HTMLElement | null = null;
    const update = () => {
      if (!element) return;
      const r = element.getBoundingClientRect();
      setRect({
        x: Math.max(8, r.left - 6),
        y: Math.max(8, r.top - 6),
        width: Math.min(innerWidth - 16, r.width + 12),
        height: Math.min(innerHeight - 16, r.height + 12),
      });
    };
    const find = () => {
      element = document.querySelector<HTMLElement>(steps[step].target);
      if (element) {
        element.scrollIntoView({ block: "center", behavior: "instant" });
        update();
        dialog.current?.focus();
      } else if (count++ < 40) frame = requestAnimationFrame(find);
    };
    frame = requestAnimationFrame(find);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Tab" && step !== -1) {
        const nodes =
          dialog.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);
  if (!ready) return null;
  return (
    <>
      <div className="demo-banner">
        <span>
          <BookOpen size={14} />
          Demo workspace · Sample commits and profiles
        </span>
        <button
          data-tooltip="Replay the guided introduction to commits, reviews, members, and exports."
          onClick={() => setStep(-1)}
        >
          Demo tour <ArrowRight size={13} />
        </button>
      </div>
      {step === -1 && (
        <Modal title="Demo introduction" close={finish}>
          <SignalMap />
          <h3 className="intro-title">How to use Relay</h3>
          <p className="muted">
            This demo has sample commits and four example profiles. You can
            inspect diffs, switch reviewers, manage members, and export a recap.
          </p>
          <ul className="intro-list">
            <li>
              <Check size={14} />
              Changes stay in this browser.
            </li>
            <li>
              <Check size={14} />
              No GitHub repositories are modified.
            </li>
            <li>
              <Check size={14} />
              Create a live team to use MongoDB and WebSocket presence.
            </li>
          </ul>
          <div className="dialog-actions">
            <button className="secondary" onClick={finish}>
              Skip introduction
            </button>
            <button className="primary" onClick={() => setStep(0)}>
              Start tour <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {step !== null &&
        step >= 0 &&
        createPortal(
          <div className="tour-overlay">
            <svg
              className="tour-mask"
              width="100%"
              height="100%"
              aria-hidden="true"
            >
              <defs>
                <mask id="relay-tour-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  {rect && (
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.width}
                      height={rect.height}
                      rx="14"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="#20172f"
                opacity=".44"
                mask="url(#relay-tour-cutout)"
              />
            </svg>
            <AnimatePresence mode="wait">
              <motion.div
                ref={dialog}
                tabIndex={-1}
                key={step}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-heading"
                className={`tour-card ${rect && rect.y > innerHeight * 0.5 ? "tour-card-top" : ""}`}
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="tour-top">
                  <span>
                    STEP {step + 1} OF {steps.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Close demo tour"
                    onClick={finish}
                  >
                    <X size={17} />
                  </button>
                </div>
                <h3 id="tour-heading">{steps[step].title}</h3>
                <p>{steps[step].text}</p>
                <div className="tour-progress">
                  {steps.map((_, i) => (
                    <span key={i} className={i === step ? "active" : ""} />
                  ))}
                </div>
                <div className="tour-actions">
                  <button
                    className="secondary"
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft size={13} />
                    Back
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      step === steps.length - 1 ? finish() : setStep(step + 1)
                    }
                  >
                    {step === steps.length - 1 ? "Finish tour" : "Next"}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </>
  );
}
