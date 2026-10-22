export type Member = {
  id: string;
  name: string;
  login: string;
  role: string;
  focus: string;
  color: string;
  receivesReviews?: boolean;
};
export type FileDiff = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};
export type Review = {
  verdict: "approved" | "changes";
  note: string;
  by: string;
  at: string;
};
export type Commit = {
  sha: string;
  title: string;
  body: string;
  author: string;
  date: string;
  branch: string;
  url: string;
  additions: number;
  deletions: number;
  files: FileDiff[];
  assignee: string;
  review?: Review;
};
export type Settings = {
  teamId?: string;
  name?: string;
  ownerId?: string;
  assignmentMode?: "automatic" | "manual";
  defaultReviewerId?: string;
  allowSelfReview?: boolean;
  repo: string;
  branch: string;
  members: Member[];
};
export type Workspace = {
  mode: "demo" | "live";
  commits: Commit[];
  settings: Settings;
  userId?: string;
  realtime: boolean;
};
