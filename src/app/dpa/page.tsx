import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/dataroom/brand-mark";

export const metadata: Metadata = {
  title: "DPA",
  description: "Data Processing Agreement for Token customers and subprocessors.",
  alternates: { canonical: "/dpa" },
};
import { Button } from "@/components/ui/button";

export default function DpaPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Data Processing Agreement
        </h1>
        <p className="tkn-fine mt-2">Last updated March 2026</p>

        <div className="mt-8 space-y-8 tkn-prose">
          <section>
            <h2>1. Parties</h2>
            <p>
              This Data Processing Agreement ("DPA") forms part of the Terms of Service between
              Token ("Processor") and the user or their organisation ("Controller") and governs the
              processing of personal data on behalf of the Controller when they use the Token
              service.
            </p>
            <p>
              For the purposes of this DPA, the Controller is the Token user who creates a
              workspace and controls what data is shared through it. The Processor is Token.
            </p>
          </section>

          <section>
            <h2>2. Subject matter and duration of processing</h2>
            <p>
              <strong>Subject matter:</strong> The processing concerns personal data submitted by
              the Controller's recipients ( signatories, viewers, and downloaders of shared
              documents) through the Controller's workspace.
            </p>
            <p>
              <strong>Duration:</strong> Processing continues for as long as the Controller's
              account and workspace are active, and for up to 30 days following account deletion
              while data is removed from backups.
            </p>
          </section>

          <section>
            <h2>3. Nature and purpose of processing</h2>
            <p>
              <strong>Purpose:</strong> To provide the Controller with a secure document sharing
              service. Specifically: encrypting and storing documents, enforcing access controls,
              recording NDA acceptances, and delivering access logs — all as directed by the
              Controller.
            </p>
            <p>
              <strong>Nature:</strong> Collection, storage, encryption, access management, and
              deletion of personal data. The Processor does not use personal data for its own
              purposes.
            </p>
          </section>

          <section>
            <h2>4. Types of personal data</h2>
            <p>The following categories of personal data may be processed:</p>
            <ul>
              <li>Recipient name, email address, company, and physical address (from NDA forms)</li>
              <li>
                Recipient IP address and user agent string (from access logs — captured at the time
                of room access)
              </li>
              <li>
                Controller account email and workspace identifier (for account management purposes)
              </li>
            </ul>
            <p>
              <strong>Special categories:</strong> The Processor does not intentionally process any
              special categories of personal data (e.g., health, racial or ethnic origin, political
              opinions). Controllers must not upload files containing special categories of personal
              data unless appropriate safeguards are in place.
            </p>
          </section>

          <section>
            <h2>5. Security measures</h2>
            <p>The Processor implements the following technical and organisational security measures:</p>
            <ul>
              <li>
                <strong>Encryption at rest:</strong> All uploaded files are encrypted client-side
                using AES-256-GCM before storage.
              </li>
              <li>
                <strong>Encryption in transit:</strong> TLS 1.2+ for all data transmissions.
              </li>
              <li>
                <strong>Access controls:</strong> Role-based access controls for internal systems;
                least-privilege principle applied.
              </li>
              <li>
                <strong>Monitoring:</strong> Access logging for all data operations; anomaly
                detection on internal accounts.
              </li>
              <li>
                <strong>Sub-processor controls:</strong> Written DPAs with all sub-processors;
                sub-processors only process data necessary to deliver their service.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Data subject rights</h2>
            <p>
              The Controller is responsible for responding to data subject requests from their
              recipients. Upon request, the Processor will:
            </p>
            <ul>
              <li>
                Provide the Controller with a machine-readable export of all data associated with a
                specific data subject within 30 days.
              </li>
              <li>
                Delete all data associated with a specific data subject within 30 days of a
                confirmed deletion request from the Controller.
              </li>
              <li>
                Assist the Controller in fulfilling any other data subject rights requests, to the
                extent technically feasible.
              </li>
            </ul>
            <p>
              Data subjects may also contact the Processor directly at{" "}
              <span className="font-mono text-sm">privacy@token.fyi</span> to exercise their
              rights.
            </p>
          </section>

          <section>
            <h2>7. Sub-processors</h2>
            <p>The Processor uses the following sub-processors:</p>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-semibold">Sub-processor</th>
                  <th className="py-2 pr-4 font-semibold">Purpose</th>
                  <th className="py-2 font-semibold">Country</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Railway</td>
                  <td className="py-2 pr-4 text-[var(--tkn-text-support)]">
                    Hosting, compute, and database
                  </td>
                  <td className="py-2 text-[var(--tkn-text-support)]">United States</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Twilio SendGrid</td>
                  <td className="py-2 pr-4 text-[var(--tkn-text-support)]">
                    Transactional email delivery
                  </td>
                  <td className="py-2 text-[var(--tkn-text-support)]">United States</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 tkn-fine">
              The Controller may object to a new sub-processor by contacting{" "}
              <span className="font-mono text-sm">privacy@token.fyi</span> within 30 days of
              receiving notice of a change.
            </p>
          </section>

          <section>
            <h2>8. Data breach notification</h2>
            <p>
              In the event of a personal data breach that is likely to result in a risk to the
              rights and freedoms of data subjects, the Processor will notify the Controller without
              undue delay and no later than 72 hours after becoming aware of the breach.
            </p>
            <p>
              Notifications will be sent to the Controller's account email. It is the Controller's
              responsibility to ensure this email address is kept current.
            </p>
          </section>

          <section>
            <h2>9. Audits</h2>
            <p>
              The Processor makes available information and documentation necessary to demonstrate
              compliance with this DPA. Controllers may request a copy of our most recent
              security audit report (if available) or a summary of our technical and organisational
              security measures by emailing{" "}
              <span className="font-mono text-sm">security@token.fyi</span>.
            </p>
          </section>

          <section>
            <h2>10. Return and deletion</h2>
            <p>
              Upon termination of the Controller's account, the Processor will — at the Controller's
              choice — either return a complete export of all workspace data as a JSON archive, or
              permanently delete all personal data within 30 days.
            </p>
            <p>
              Data removed from active systems may persist in backups for up to 30 additional days
              before being permanently overwritten.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-8 text-sm text-[var(--tkn-text-fine)]">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
