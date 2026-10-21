import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "@/components/motion-provider";
export const metadata: Metadata = {
  title: "Relay — Commit tracker",
  description:
    "Track repository commits, review code changes, and manage your hackathon team.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
