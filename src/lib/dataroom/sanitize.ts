/**
 * Sanitizes HTML content to prevent XSS when rendering user-controlled NDA text.
 * Uses DOMPurify in the browser; falls back to basic tag-stripping during SSR.
 */

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr",
];

const ALLOWED_ATTR = [
  "href", "target", "rel",
  "class", "id",
  "style",
];

/** SSR-safe fallback: strip dangerous tags and attributes using regex. */
function ssrSanitize(dirty: string): string {
  const allowedSet = new Set(ALLOWED_TAGS);
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/gi;
  return dirty
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(tagPattern, (match, tag: string) =>
      allowedSet.has(tag.toLowerCase()) ? match : "",
    );
}

function ssrStripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// Lazy-loaded DOMPurify instance (browser only)
let purifyInstance: { sanitize: (dirty: string, cfg?: Record<string, unknown>) => string } | null = null;
let purifyLoaded = false;

function getPurify() {
  if (typeof window === "undefined") return null;
  if (purifyLoaded) return purifyInstance;
  purifyLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("dompurify");
    // dompurify v3 default export is a factory that auto-initializes with window
    purifyInstance = typeof mod === "function" ? mod(window) : mod.default ? (typeof mod.default === "function" ? mod.default(window) : mod.default) : mod;
  } catch {
    purifyInstance = null;
  }
  return purifyInstance;
}

export const sanitizeHtml = (dirty: string): string => {
  const purify = getPurify();
  if (purify) {
    return purify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ["target"],
      FORCE_BODY: false,
    });
  }
  return ssrSanitize(dirty);
};

/** Strip all HTML tags — returns plain text. */
export const stripHtml = (html: string): string => {
  const purify = getPurify();
  if (purify) {
    return purify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  return ssrStripHtml(html);
};
