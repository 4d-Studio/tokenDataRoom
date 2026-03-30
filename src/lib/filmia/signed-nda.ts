import { formatDateTime } from "@/lib/filmia/helpers";
import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/filmia/types";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "signer";

export const createSignedNdaFilename = (
  metadata: VaultRecord,
  acceptance: VaultAcceptanceRecord,
) => `${metadata.slug}-signed-nda-${slugify(acceptance.signerName)}.html`;

export const renderSignedNdaHtml = (
  metadata: VaultRecord,
  acceptance: VaultAcceptanceRecord,
) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signed NDA Receipt</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        background: #f6f8fc;
        color: #162033;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .page {
        max-width: 840px;
        margin: 0 auto;
        padding: 40px 24px 64px;
      }
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
      h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.1;
      }
      p {
        font-size: 15px;
        line-height: 1.7;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .meta-block,
      .section {
        border: 1px solid rgba(16, 24, 40, 0.1);
        border-radius: 18px;
        padding: 18px 20px;
      }
      .label {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #5f6b7c;
        margin-bottom: 8px;
      }
      .value {
        font-size: 15px;
        line-height: 1.7;
      }
      .nda {
        white-space: pre-wrap;
      }
      .signature-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        gap: 24px;
        align-items: end;
        margin-top: 24px;
      }
      .signature-line {
        border-bottom: 1px solid rgba(16, 24, 40, 0.24);
        min-height: 52px;
        display: flex;
        align-items: end;
        padding-bottom: 8px;
        font-size: 24px;
        font-family: "Times New Roman", Georgia, serif;
      }
      .footer {
        margin-top: 18px;
        color: #5f6b7c;
        font-size: 13px;
      }
      @media (max-width: 720px) {
        .meta,
        .signature-row {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <p class="eyebrow">Filmia signed receipt</p>
        <h1>Signed NDA copy</h1>
        <p>
          This receipt confirms that <strong>${escapeHtml(acceptance.signerName)}</strong>
          accepted the NDA for <strong>${escapeHtml(metadata.title)}</strong> on
          ${escapeHtml(formatDateTime(acceptance.acceptedAt))}.
        </p>

        <div class="meta">
          <div class="meta-block">
            <div class="label">Signer</div>
            <div class="value">${escapeHtml(acceptance.signerName)}</div>
          </div>
          <div class="meta-block">
            <div class="label">Work email</div>
            <div class="value">${escapeHtml(acceptance.signerEmail)}</div>
          </div>
          <div class="meta-block">
            <div class="label">Company</div>
            <div class="value">${escapeHtml(acceptance.signerCompany || "Not provided")}</div>
          </div>
          <div class="meta-block">
            <div class="label">Address</div>
            <div class="value">${escapeHtml(acceptance.signerAddress)}</div>
          </div>
          <div class="meta-block">
            <div class="label">NDA version</div>
            <div class="value">${escapeHtml(acceptance.ndaVersion)}</div>
          </div>
          <div class="meta-block">
            <div class="label">Room</div>
            <div class="value">${escapeHtml(metadata.title)}</div>
          </div>
        </div>

        <div class="section" style="margin-top: 24px;">
          <div class="label">NDA text</div>
          <div class="value nda">${escapeHtml(metadata.ndaText || "")}</div>
        </div>

        <div class="signature-row">
          <div>
            <div class="label">Electronic signature</div>
            <div class="signature-line">${escapeHtml(acceptance.signatureName)}</div>
          </div>
          <div>
            <div class="label">Accepted</div>
            <div class="value">${escapeHtml(formatDateTime(acceptance.acceptedAt))}</div>
          </div>
        </div>

        <p class="footer">
          Generated by Filmia as a copy of the signed NDA acceptance record.
        </p>
      </section>
    </main>
  </body>
</html>`;
