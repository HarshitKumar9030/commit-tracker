import { z } from "zod";
export type DriveKind =
  "document" | "spreadsheet" | "presentation" | "folder" | "file";
export type TeamFile = {
  id: string;
  driveId: string;
  kind: DriveKind;
  url: string;
  previewUrl: string;
  title: string;
  description: string;
  category: "general" | "code" | "presentation" | "reference";
  addedBy: string;
  addedAt: string;
  updatedAt: string;
  pinned: boolean;
  archivedAt?: string;
};
const identifier = /^[a-zA-Z0-9_-]{5,200}$/;
export function parseDriveLink(input: string): {
  driveId: string;
  kind: DriveKind;
  url: string;
  previewUrl: string;
} {
  let link: URL;
  try {
    link = new URL(input.trim());
  } catch {
    throw new Error(
      "Paste a valid Google Drive, Docs, Sheets, or Slides link.",
    );
  }
  if (
    link.protocol !== "https:" ||
    !["drive.google.com", "docs.google.com"].includes(link.hostname) ||
    link.username ||
    link.password ||
    link.port
  )
    throw new Error(
      "Use an https://drive.google.com or https://docs.google.com link.",
    );
  let kind: DriveKind = "file";
  let driveId = "";
  if (link.hostname === "docs.google.com") {
    const match = link.pathname.match(
      /^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
    );
    if (match) {
      driveId = match[2];
      kind = (
        {
          document: "document",
          spreadsheets: "spreadsheet",
          presentation: "presentation",
        } as const
      )[match[1] as "document" | "spreadsheets" | "presentation"];
    }
  } else {
    const folder = link.pathname.match(
      /\/(?:folders)\/([a-zA-Z0-9_-]+)(?:\/|$)/,
    );
    const file = link.pathname.match(
      /^\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
    );
    if (folder) {
      driveId = folder[1];
      kind = "folder";
    } else if (file) driveId = file[1];
    else if (["/open", "/uc"].includes(link.pathname))
      driveId = link.searchParams.get("id") || "";
  }
  if (!identifier.test(driveId))
    throw new Error(
      "That link does not point to a supported Drive file or folder. Use its Share → Copy link URL.",
    );
  const resourceKey = link.searchParams.get("resourcekey");
  if (resourceKey && !identifier.test(resourceKey))
    throw new Error("The Drive resource key is invalid.");
  const suffix = resourceKey
    ? `?resourcekey=${encodeURIComponent(resourceKey)}`
    : "";
  const base =
    kind === "document"
      ? `https://docs.google.com/document/d/${driveId}`
      : kind === "spreadsheet"
        ? `https://docs.google.com/spreadsheets/d/${driveId}`
        : kind === "presentation"
          ? `https://docs.google.com/presentation/d/${driveId}`
          : `https://drive.google.com/file/d/${driveId}`;
  return {
    driveId,
    kind,
    url:
      kind === "folder"
        ? `https://drive.google.com/drive/folders/${driveId}${suffix}`
        : `${base}/${kind === "file" ? "view" : "edit"}${suffix}`,
    previewUrl:
      kind === "folder"
        ? `https://drive.google.com/embeddedfolderview?id=${driveId}${resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : ""}#list`
        : `${base}/preview${suffix}`,
  };
}
export const teamFileInput = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .refine((value) => {
      try {
        parseDriveLink(value);
        return true;
      } catch {
        return false;
      }
    }, "Use a Google Drive file or folder sharing link."),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  category: z
    .enum(["general", "code", "presentation", "reference"])
    .default("general"),
});
export function canManageFile(
  file: TeamFile,
  memberId: string,
  ownerId?: string,
) {
  return file.addedBy === memberId || ownerId === memberId;
}
export const FILE_CATEGORIES = {
  general: "General",
  code: "Code",
  presentation: "Presentation",
  reference: "Reference",
} as const;
