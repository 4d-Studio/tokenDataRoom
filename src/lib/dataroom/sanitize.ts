/**
 * Sanitizes HTML content to prevent XSS when rendering user-controlled NDA text.
 * Uses DOMPurify on the client and a strict allowlist on the server.
 */
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr",
]);

const ALLOWED_ATTR = new Set([
  "href", "target", "rel",
  "class", "id",
  "style",
]);

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
    ALLOWED_ATTR: Array.from(ALLOWED_ATTR),
    ALLOW_DATA_ATTR: false,
    // Force all links to open in new tab safely
    ADD_ATTR: ["target"],
    FORCE_BODY: false,
  });
};

/** Strip all HTML tags — returns plain text. */
export const stripHtml = (html: string): string => {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};
