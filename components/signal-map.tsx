"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
export default function SignalMap({ compact = false }: { compact?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".signal-path",
          { strokeDasharray: 240, strokeDashoffset: 240 },
          {
            strokeDashoffset: 0,
            duration: 1.5,
            stagger: 0.15,
            ease: "power2.out",
          },
        );
        gsap.to(".signal-packet", {
          strokeDashoffset: -260,
          duration: 4,
          repeat: -1,
          stagger: 0.5,
          ease: "none",
        });
        gsap.fromTo(
          ".signal-node",
          { scale: 0.8, opacity: 0.55 },
          {
            scale: 1,
            opacity: 1,
            transformOrigin: "50% 50%",
            duration: 1.6,
            repeat: -1,
            yoyo: true,
            stagger: 0.3,
            ease: "sine.inOut",
          },
        );
        gsap.to(".signal-orbit", {
          rotation: 360,
          transformOrigin: "50% 50%",
          duration: 32,
          repeat: -1,
          ease: "none",
        });
      }, ref);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <svg
      ref={ref}
      className={`signal-map ${compact ? "compact" : ""}`}
      viewBox="0 0 280 110"
      fill="none"
      aria-hidden="true"
    >
      <g className="signal-orbit">
        <circle
          cx="140"
          cy="55"
          r="45"
          stroke="currentColor"
          opacity=".08"
          strokeDasharray="3 9"
        />
      </g>
      {[
        "M30 30C82 30 84 55 140 55",
        "M30 85C80 85 92 55 140 55",
        "M140 55C195 55 196 22 250 22",
        "M140 55C192 55 197 85 250 85",
      ].map((d, i) => (
        <g key={d}>
          <path
            className="signal-path"
            d={d}
            stroke="currentColor"
            strokeWidth="1.5"
            opacity=".2"
          />
          <path
            className="signal-packet"
            d={d}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 252"
            strokeDashoffset={i * 50}
          />
        </g>
      ))}
      {[
        [30, 30],
        [30, 85],
        [140, 55],
        [250, 22],
        [250, 85],
      ].map(([x, y], i) => (
        <g className="signal-node" key={i}>
          <circle
            cx={x}
            cy={y}
            r={i === 2 ? 15 : 10}
            fill={i === 2 ? "#7554e8" : "#e5dcfa"}
          />
          <circle
            cx={x}
            cy={y}
            r={i === 2 ? 4 : 3}
            fill={i === 2 ? "white" : "#a18ac7"}
          />
        </g>
      ))}
    </svg>
  );
}
