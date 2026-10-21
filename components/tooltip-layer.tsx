"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
type Tip = { text: string; x: number; y: number; above: boolean };
export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    const clear = () => {
      clearTimeout(timer);
      current?.removeAttribute("aria-describedby");
      current = null;
      setTip(null);
    };
    const show = (e: Event) => {
      const target = (e.target as Element)?.closest<HTMLElement>(
        "[data-tooltip]",
      );
      if (!target || target === current) return;
      clear();
      current = target;
      timer = setTimeout(() => {
        if (!current) return;
        const r = current.getBoundingClientRect(),
          above = r.top > 65;
        current.setAttribute("aria-describedby", "relay-tooltip");
        setTip({
          text: current.dataset.tooltip || "",
          x: Math.max(132, Math.min(innerWidth - 132, r.left + r.width / 2)),
          y: above ? r.top - 9 : r.bottom + 9,
          above,
        });
      }, 250);
    };
    const leave = (e: MouseEvent) => {
      if (current && !current.contains(e.relatedTarget as Node | null)) clear();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    document.addEventListener("mouseover", show);
    document.addEventListener("focusin", show);
    document.addEventListener("mouseout", leave);
    document.addEventListener("focusout", clear);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", clear, true);
    return () => {
      clearTimeout(timer);
      current?.removeAttribute("aria-describedby");
      document.removeEventListener("mouseover", show);
      document.removeEventListener("focusin", show);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("focusout", clear);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", clear, true);
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.text}
          id="relay-tooltip"
          role="tooltip"
          className="tooltip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            left: tip.x,
            top: tip.y,
            transform: tip.above ? "translate(-50%,-100%)" : "translateX(-50%)",
          }}
        >
          {tip.text}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
