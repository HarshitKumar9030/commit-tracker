import "server-only";
import { ZodError } from "zod";
import { MongoClient } from "mongodb";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Rest } from "ably";
import type { Settings, Commit } from "./types";
import { assignReviewer } from "./rules";

const globalDb = globalThis as unknown as {
  mongoPromise?: Promise<MongoClient>;
};
export const configured = () =>
  Boolean(process.env.MONGODB_URI && process.env.SESSION_SECRET);
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function db() {
  if (!process.env.MONGODB_URI)
    throw new ApiError(503, "Add MONGODB_URI to enable the live workspace.");
  if (!globalDb.mongoPromise)
    globalDb.mongoPromise = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })
      .connect()
      .catch((e) => {
        globalDb.mongoPromise = undefined;
        throw e;
      });
  return (await globalDb.mongoPromise).db(process.env.MONGODB_DB || "relay");
}
export async function settings(explicitTeamId?: string): Promise<Settings> {
  let teamId = explicitTeamId;
  if (!teamId) {
    try {
      teamId = (await session()).teamId;
    } catch {
      teamId = "workspace";
    }
  }
  const data = await (
    await db()
  )
    .collection<Settings & { _id: string }>("settings")
    .findOne({ _id: teamId });
  if (!data) {
    if (teamId !== "workspace")
      throw new ApiError(404, "Team group not found.");
    return {
      teamId: "workspace",
      name: "Hackathon workspace",
      repo: process.env.GITHUB_REPO || "HarshitKumar9030/commit-tracker",
      branch: "main",
      members: [],
    };
  }
  return {
    teamId,
    name: data.name || "Hackathon workspace",
    ownerId: data.ownerId || data.members[0]?.id,
    repo: data.repo,
    branch: data.branch,
    members: data.members,
  };
}
export function sign(value: string) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new ApiError(503, "Set SESSION_SECRET to at least 32 characters.");
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");
}
export async function session() {
  const token = (await cookies()).get("relay-session")?.value;
  if (!token) throw new ApiError(401, "Join your workspace to continue.");
  const [body, signature] = token.split(".");
  const expected = sign(body);
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new ApiError(401, "Session expired. Please join again.");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  if (payload.exp < Date.now())
    throw new ApiError(401, "Session expired. Please join again.");
  return {
    id: payload.id as string,
    teamId: (payload.teamId || "workspace") as string,
  };
}
export async function user() {
  const current = await session();
  const s = await settings(current.teamId);
  const member = s.members.find((m) => m.id === current.id);
  if (!member)
    throw new ApiError(401, "You are no longer a member of this team.");
  return { ...member, teamId: current.teamId };
}
export async function issueSession(id: string, teamId: string) {
  const body = Buffer.from(
    JSON.stringify({ id, teamId, exp: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  (await cookies()).set("relay-session", `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function publish(teamId?: string) {
  if (!teamId) {
    try {
      teamId = (await session()).teamId;
    } catch {
      teamId = "workspace";
    }
  }
  if (process.env.ABLY_API_KEY) {
    try {
      await new Rest(process.env.ABLY_API_KEY).channels
        .get(`relay:${teamId}`)
        .publish("refresh", { at: Date.now() });
    } catch (e) {
      console.error("Realtime notification failed", e);
    }
  }
}
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      {
        error:
          "Check your inputs: " + error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 },
    );
  console.error("Workspace request failed", error);
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Check the server logs and try again.",
    },
    { status: error instanceof ApiError ? error.status : 500 },
  );
}
export async function github(path: string) {
  const response = await fetch(`https://api.github.com/repos/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      `GitHub returned ${response.status}. Check repository access and rate limits.`,
    );
  return response.json();
}
export async function ingest(
  repo: string,
  branch: string,
  shas: string[],
  teamId?: string,
) {
  const s = await settings(teamId);
  teamId = s.teamId || "workspace";
  const database = await db();
  const col = database.collection<Commit & { _id: string; repo: string }>(
    "commits",
  );
  let added = 0;
  for (let i = 0; i < shas.length; i += 5) {
    await Promise.all(
      shas.slice(i, i + 5).map(async (sha) => {
        const key = `${teamId}:${repo}:${branch}:${sha}`;
        if (await col.findOne({ _id: key }, { projection: { _id: 1 } })) return;
        const data = await github(`${repo}/commits/${sha}`);
        const author = data.author?.login || data.commit.author.name;
        const commit: Commit = {
          sha: data.sha,
          title: data.commit.message.split("\n")[0],
          body: data.commit.message.split("\n").slice(1).join("\n").trim(),
          author,
          date: data.commit.author.date,
          branch,
          url: data.html_url,
          additions: data.stats?.additions || 0,
          deletions: data.stats?.deletions || 0,
          files: (data.files || []).map(
            (f: {
              filename: string;
              status: string;
              additions: number;
              deletions: number;
              patch?: string;
            }) => ({
              filename: f.filename,
              status: f.status,
              additions: f.additions,
              deletions: f.deletions,
              ...(f.patch ? { patch: f.patch } : {}),
            }),
          ),
          assignee: s.members.some(
            (m) => m.login.toLowerCase() !== author.toLowerCase(),
          )
            ? assignReviewer(data.sha, author, s.members)
            : "",
        };
        const r = await col.updateOne(
          { _id: key },
          { $setOnInsert: { ...commit, repo, teamId } },
          { upsert: true },
        );
        added += r.upsertedCount;
      }),
    );
  }
  await publish(teamId);
  return added;
}
