"use client";
import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
export default function AnimatedCount({ value }: { value: number }) {
  const counter = useMotionValue(0),
    reduce = useReducedMotion();
  const display = useTransform(counter, (n) =>
    Math.round(n).toString().padStart(2, "0"),
  );
  useEffect(() => {
    const control = animate(counter, value, {
      duration: reduce ? 0 : 0.65,
      ease: "easeOut",
    });
    return () => control.stop();
  }, [counter, value, reduce]);
  return <motion.strong aria-label={String(value)}>{display}</motion.strong>;
}
