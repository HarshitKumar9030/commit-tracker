import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDriveLink,
  teamFileInput,
  canManageFile,
  type TeamFile,
} from "../lib/team-files";

test("Drive links normalize documents, sheets, slides, folders and PDFs while preserving access keys", () => {
  const document = parseDriveLink(
    "https://docs.google.com/document/d/demoDocument123/edit?usp=sharing#heading=h.123",
  );
  assert.equal(document.kind, "document");
  assert.equal(
    document.previewUrl,
    "https://docs.google.com/document/d/demoDocument123/preview",
  );
  assert.equal(
    parseDriveLink(
      "https://docs.google.com/spreadsheets/d/demoSheet123/edit#gid=0",
    ).kind,
    "spreadsheet",
  );
  assert.equal(
    parseDriveLink("https://docs.google.com/presentation/d/demoSlides123/edit")
      .kind,
    "presentation",
  );
  const file = parseDriveLink(
    "https://drive.google.com/open?id=demoPdf123&resourcekey=resource123&usp=sharing",
  );
  assert.equal(
    file.url,
    "https://drive.google.com/file/d/demoPdf123/view?resourcekey=resource123",
  );
  assert.equal(
    file.previewUrl,
    "https://drive.google.com/file/d/demoPdf123/preview?resourcekey=resource123",
  );
  assert.equal(
    parseDriveLink("https://drive.google.com/drive/u/0/folders/demoFolder123")
      .kind,
    "folder",
  );
});
test("Drive sharing rejects executable, spoofed, credential-bearing, unrelated and malformed URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://drive.google.com/file/d/demoPdf123/view",
    "https://drive.google.com.evil.test/file/d/demoPdf123/view",
    "https://drive.google.com@evil.test/file/d/demoPdf123/view",
    "https://user:password@drive.google.com/file/d/demoPdf123/view",
    "https://drive.google.com/drive/my-drive",
    "https://docs.google.com/document/d/e/published/pub",
    "https://drive.google.com/file/d/demoPdf123/view?resourcekey=%3Cscript%3E",
  ])
    assert.throws(() => parseDriveLink(value), value);
  assert.equal(
    teamFileInput.safeParse({
      url: "https://example.com/file.pdf",
      title: "Example",
    }).success,
    false,
  );
});
test("only the sharer and team creator can manage a shared entry", () => {
  const file = { addedBy: "syed" } as TeamFile;
  assert.equal(canManageFile(file, "syed", "harshit"), true);
  assert.equal(canManageFile(file, "harshit", "harshit"), true);
  assert.equal(canManageFile(file, "trisha", "harshit"), false);
});
