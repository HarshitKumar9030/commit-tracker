import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownNotes from "../components/markdown-notes";

test("notes render Markdown headings, lists, tables, and code without executing HTML", () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownNotes, {
      text: "# Summary\n\n**Changed** `indexCommit`\n\n- Added a component\n\n| File | Change |\n| --- | --- |\n| app.ts | Added |\n\n```ts\nconst count = 2;\n```\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n[Docs](https://example.com)",
    }),
  );
  assert.match(html, /<h1>Summary<\/h1>/);
  assert.match(html, /<strong>Changed<\/strong>/);
  assert.match(html, /<table>/);
  assert.match(html, /<li>Added a component<\/li>/);
  assert.match(html, /language-ts/);
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /rel="noopener noreferrer"/);
});
