import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Relay — Build together. Stay in sync.",
  description:
    "A shared pulse for your hackathon. Track commits, review changes, and tell your project’s story.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
