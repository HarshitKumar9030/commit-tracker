"use client";
import { motion, useReducedMotion } from "framer-motion";
export default function LiveSignal({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  return (
    <svg
      className="live-signal"
      width="25"
      height="16"
      viewBox="0 0 25 16"
      aria-hidden="true"
    >
      <motion.path
        d="M1 8H5L8 3L12 13L16 5L19 8H24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{
          pathLength: active && !reduced ? [0.1, 1, 1] : 1,
          opacity: active && !reduced ? [0.45, 1, 0.45] : 0.5,
        }}
        transition={{
          duration: 3,
          repeat: active && !reduced ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}
