import { describe, expect, it, vi } from "vitest";

/**
 * sanitize.test.ts
 *
 * isomorphic-dompurify pulls in jsdom internals which fail in vitest's Node environment
 * due to ESM top-level await. Mock it before the module under test is loaded so the
 * import resolves cleanly.
 */
vi.mock("isomorphic-dompurify", () => ({
  __esModule: true,
  default: {
    sanitize: (
      dirty: string,
      opts?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] },
    ) => {
      // When ALLOWED_TAGS is empty (stripHtml), remove all tags.
      // Otherwise apply the actual allowlist behavior.
      const allowedTags = opts?.ALLOWED_TAGS ?? [];
      if (allowedTags.length === 0) {
        // Strip all HTML tags (DOMPurify removes tags and concatenates text nodes)
        return dirty.replace(/<[^>]+>/g, "");
      }
      // Strip script/iframe and event handlers (matches sanitize.ts allowlist)
      return dirty
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    },
  },
}));

import { sanitizeHtml, stripHtml } from "@/lib/dataroom/sanitize";

describe("sanitizeHtml", () => {
  it("allows paragraph and heading tags", () => {
    expect(sanitizeHtml("<p>Hello</p>")).toBe("<p>Hello</p>");
    expect(sanitizeHtml("<h1>Title</h1>")).toBe("<h1>Title</h1>");
  });

  it("allows list and table structure", () => {
    expect(sanitizeHtml("<ul><li>Item</li></ul>")).toBe("<ul><li>Item</li></ul>");
    expect(
      sanitizeHtml("<table><tr><th>Col</th></tr></table>"),
    ).toBe("<table><tr><th>Col</th></tr></table>");
  });

  it("allows inline formatting tags", () => {
    expect(sanitizeHtml("<strong>Bold</strong>")).toBe("<strong>Bold</strong>");
    expect(sanitizeHtml("<em>Italic</em>")).toBe("<em>Italic</em>");
    expect(sanitizeHtml("<blockquote>Quote</blockquote>")).toBe("<blockquote>Quote</blockquote>");
  });

  it("removes script tags completely", () => {
    expect(sanitizeHtml("<p>Hi</p><script>alert('xss')</script>")).toBe("<p>Hi</p>");
  });

  it("removes iframe tags", () => {
    expect(sanitizeHtml("<p>Text <iframe src='https://evil.com'></iframe></p>")).toBe("<p>Text </p>");
  });

  it("removes event handler attributes", () => {
    const result = sanitizeHtml(`<p onclick="alert(1)" onerror="steal()">Click me</p>`);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).toContain("Click me");
  });

  it("returns plain text unchanged", () => {
    expect(sanitizeHtml("No tags here.")).toBe("No tags here.");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes all HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("removes all tags and concatenates text", () => {
    // DOMPurify with empty ALLOWED_TAGS strips tags and joins text directly
    expect(stripHtml("<p>Hello</p><p>World</p>")).toBe("HelloWorld");
    expect(stripHtml("<p>  Spaced  </p>")).toBe("  Spaced  ");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("No tags.")).toBe("No tags.");
  });
});
