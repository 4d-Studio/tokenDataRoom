import { formatDateTime } from "@/lib/dataroom/helpers";
import type { SigningRequest, VaultRecord } from "@/lib/dataroom/types";

import { sortSigningSigners } from "@/lib/dataroom/document-signing";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const createSigningCertificateFilename = (
  metadata: VaultRecord,
  request: SigningRequest,
  fileLabel: string,
) => {
  const safe = fileLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${metadata.slug}-signed-document-${safe || "pdf"}.html`;
};

export const renderDocumentSigningCertificateHtml = (
  metadata: VaultRecord,
  request: SigningRequest,
  fileName: string,
) => {
  const ordered = sortSigningSigners(request);
  const rows = ordered
    .map((s, i) => {
      const sig = s.signatureName ? escapeHtml(s.signatureName) : "—";
      const when = s.signedAt ? escapeHtml(formatDateTime(s.signedAt)) : "—";
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(16,24,40,0.08);">${i + 1}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(16,24,40,0.08);">${escapeHtml(s.name || s.email)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(16,24,40,0.08);">${escapeHtml(s.email)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(16,24,40,0.08);">${when}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(16,24,40,0.08);font-family:Georgia,serif;font-size:18px;">${sig}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Document signing certificate</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        background: #f6f8fc;
        color: #162033;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .page { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px; }
      .card {
        background: #fff;
        border: 1px solid rgba(16, 24, 40, 0.12);
        border-radius: 24px;
        padding: 32px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #5f6b7c;
        margin: 0 0 12px;
      }
      h1 { margin: 0; font-size: 28px; line-height: 1.15; }
      p { font-size: 15px; line-height: 1.7; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
      th {
        text-align: left;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #5f6b7c;
        padding: 8px 16px;
        border-bottom: 2px solid rgba(16, 24, 40, 0.12);
      }
      .footer { margin-top: 24px; color: #5f6b7c; font-size: 13px; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <p class="eyebrow">Token document signing</p>
        <h1>Completion certificate</h1>
        <p>
          This log records electronic signatures collected in order for
          <strong>${escapeHtml(fileName)}</strong> in the room
          <strong>${escapeHtml(metadata.title)}</strong>.
          ${request.message ? `Note from sender: ${escapeHtml(request.message)}` : ""}
        </p>
        <p style="font-size:14px;color:#5f6b7c;">
          Workflow started ${escapeHtml(formatDateTime(request.createdAt))}.
          Status: <strong>${escapeHtml(request.status)}</strong>.
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Signer</th>
              <th>Email</th>
              <th>Signed</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">
          The underlying PDF remains encrypted in Token storage; this certificate summarizes who signed and when.
          Not a substitute for legal advice or jurisdiction-specific e-sign requirements.
        </p>
      </section>
    </main>
  </body>
</html>`;
};
