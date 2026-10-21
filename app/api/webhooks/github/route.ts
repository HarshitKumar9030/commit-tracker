import { verifySignature } from "@/lib/rules";
import { settings, github, ingest, failure, ApiError } from "@/lib/server";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503, "Webhook secret not configured.");
    const raw = await req.text();
    if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret))
      throw new ApiError(401, "Invalid webhook signature.");
    if (req.headers.get("x-github-event") === "ping")
      return Response.json({ ok: true });
    if (req.headers.get("x-github-event") !== "push")
      return Response.json({ ignored: true });
    const payload = JSON.parse(raw);
    const teamId = new URL(req.url).searchParams.get("team") || "workspace";
    const s = await settings(teamId);
    if (
      payload.repository?.full_name.toLowerCase() !== s.repo.toLowerCase() ||
      payload.ref !== `refs/heads/${s.branch}` ||
      payload.deleted
    )
      return Response.json({ ignored: true });
    const list = await github(
      `${s.repo}/commits?sha=${encodeURIComponent(s.branch)}&per_page=20`,
    );
    const shas = [
      ...new Set<string>([
        ...(payload.commits || []).map((c: { id: string }) => c.id),
        ...list.map((c: { sha: string }) => c.sha),
      ]),
    ]
      .filter((x) => /^[a-f0-9]{40}$/.test(x))
      .slice(0, 100);
    const added = await ingest(s.repo, s.branch, shas, teamId);
    return Response.json({ added });
  } catch (e) {
    return failure(e);
  }
}
