import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/dataroom/brand-mark";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Token handles your data: encryption, retention, and your control over dataroom content.",
};
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/">
            <BrandMark />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="tkn-fine mt-2">Last updated March 2026</p>

        <div className="mt-8 space-y-8 tkn-prose">
          <section>
            <h2>1. Who we are</h2>
            <p>
              {`Token ("we", "us", or "our") operates the website at `}
              <span className="font-mono text-sm">token.fyi</span>
              {` and related services. We provide secure document sharing rooms with end-to-end encryption. We act as the data controller for all personal data processed in connection with our service.`}
            </p>
          </section>

          <Separator />

          <section>
            <h2>2. What data we collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul>
              <li>
                <strong>Account data</strong> — your email address, provided when you create an account
                via magic-link login.
              </li>
              <li>
                <strong>Workspace data</strong> — the name and company name of your workspace, and any
                logo you upload.
              </li>
              <li>
                <strong>Shared document metadata</strong> — file names, file sizes, MIME types, and
                room settings (expiry, access controls) you configure.
              </li>
              <li>
                <strong>Acceptance records</strong> — when a recipient signs an NDA to access your
                room, we record their name, email, company, address, and signature.
              </li>
              <li>
                <strong>Access logs</strong> — timestamps and IP addresses of recipients who view or
                download documents from your rooms.
              </li>
              <li>
                <strong>Cookie data</strong> — a signed session cookie to keep you logged in, and an
                access token cookie when you open a shared room.
              </li>
            </ul>
            <p>
              <strong>Important:</strong> Files you upload are encrypted client-side (AES-256-GCM)
              before they reach our servers. We never have access to the plaintext of your files or
              the passwords used to protect them.
            </p>
          </section>

          <Separator />

          <section>
            <h2>3. How we use your data</h2>
            <ul>
              <li>To create and manage your account and workspace</li>
              <li>To deliver shared documents to recipients you invite</li>
              <li>To record NDA acceptances and access logs you request</li>
              <li>To notify you about document activity via email (when you opt in)</li>
              <li>To operate, secure, and improve our service</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or share your personal data with third parties
              for their own marketing purposes.
            </p>
          </section>

          <Separator />

          <section>
            <h2>4. Encryption</h2>
            <p>
              All files uploaded to Token are encrypted client-side using AES-256-GCM with a key
              derived from your chosen password (PBKDF2, 250,000 iterations). This means:
            </p>
            <ul>
              <li>The server stores only the encrypted blob and key-derivation parameters.</li>
              <li>We cannot decrypt your files without your password.</li>
              <li>If you lose your password, encrypted files cannot be recovered.</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2>5. Data retention</h2>
            <p>
              We retain your personal data for as long as your account is active. You may delete your
              account and all associated data at any time from your workspace settings. Upon deletion,
              we remove:
            </p>
            <ul>
              <li>Your user account and workspace</li>
              <li>All rooms, files, and access logs in your workspace</li>
              <li>All NDA acceptance records associated with your workspace</li>
            </ul>
            <p>
              Deletion is permanent and cannot be undone. Data removed from our active systems may
              persist in backups for up to 30 days before being overwritten.
            </p>
          </section>

          <Separator />

          <section>
            <h2>6. Your rights</h2>
            <p>You have the following rights over your personal data:</p>
            <ul>
              <li>
                <strong>Access</strong> — request a copy of all personal data we hold about you.
              </li>
              <li>
                <strong>Deletion</strong> — delete your account and all associated data at any time
                from your workspace settings page.
              </li>
              <li>
                <strong>Portability</strong> — export your workspace data as a JSON file before
                deleting your account.
              </li>
              <li>
                <strong>Correction</strong> — update your email, workspace name, or company name at
                any time.
              </li>
            </ul>
            <p>
              To exercise any of these rights, log in to your account and visit your workspace
              settings, or contact us at{" "}
              <span className="font-mono text-sm">privacy@token.fyi</span>.
            </p>
          </section>

          <Separator />

          <section>
            <h2>7. Cookies</h2>
            <p>We use only functional, necessary cookies:</p>
            <ul>
              <li>
                <strong>Session cookie</strong> — keeps you logged in. HttpOnly, signed with HMAC-SHA256.
                Automatically removed when you log out.
              </li>
              <li>
                <strong>Access token cookie</strong> — set when you open a shared room using an
                owner link. HttpOnly. Used to manage room access.
              </li>
            </ul>
            <p>
              We do not use advertising cookies, analytics cookies, or any tracking pixels. We do not
              honor "Do Not Track" signals as we do not track across sites.
            </p>
          </section>

          <Separator />

          <section>
            <h2>8. Third-party processors</h2>
            <p>
              We use the following third-party services to operate Token. Each is a data processor
              acting only on our instructions:
            </p>
            <ul>
              <li>
                <strong>Vercel</strong> — hosting and server infrastructure.{" "}
                <a href="https://vercel.com/legal/privacy-policy" className="underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <strong>Vercel Blob</strong> — encrypted file storage (when configured).{" "}
                <a href="https://vercel.com/legal/privacy-policy" className="underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <strong>SendGrid</strong> — transactional email delivery (OTP codes).{" "}
                <a href="https://www.twilio.com/legal/privacy" className="underline">
                  Privacy Policy
                </a>
              </li>
            </ul>
            <p>
              We may update this list if we change service providers. Updates will be posted on this
              page.
            </p>
          </section>

          <Separator />

          <section>
            <h2>9. Data security</h2>
            <p>
              We implement industry-standard technical and organisational measures to protect your
              personal data, including:
            </p>
            <ul>
              <li>TLS encryption in transit (HTTPS everywhere)</li>
              <li>AES-256-GCM encryption at rest for all uploaded files</li>
              <li>HMAC-SHA256 signed session cookies</li>
              <li>Access logging and anomaly detection</li>
              <li>Least-privilege access controls for our own team</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2>10. Children</h2>
            <p>
              Token is not directed at individuals under the age of 16. We do not knowingly collect
              personal data from children. If you believe a child has provided us with personal data,
              contact us at <span className="font-mono text-sm">privacy@token.fyi</span> and we
              will delete it promptly.
            </p>
          </section>

          <Separator />

          <section>
            <h2>11. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated version
              on this page with a revised "Last updated" date. For material changes, we will notify
              you by email if you have an active account.
            </p>
          </section>

          <Separator />

          <section>
            <h2>12. Contact</h2>
            <p>
              For any questions about this Privacy Policy or to exercise your rights, contact us at:
            </p>
            <p>
              <span className="font-mono text-sm">privacy@token.fyi</span>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-8 text-sm text-[var(--tkn-text-fine)]">
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/dpa" className="hover:text-foreground">
            Data Processing Agreement
          </Link>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
