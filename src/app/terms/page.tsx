import Link from "next/link";
import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="odr-fine mt-2">Last updated March 2026</p>

        <div className="mt-8 space-y-8 odr-prose">
          <section>
            <h2>1. Acceptance</h2>
            <p>
              By accessing or using OpenDataRoom.("the Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to these Terms, do not use the Service. These
              Terms form a binding agreement between you ("you", "User") and OpenDataRoom.("we", "us",
              "Service Provider").
            </p>
          </section>

          <Separator />

          <section>
            <h2>2. Description of service</h2>
            <p>
              OpenDataRoom.provides a secure online service for sharing documents within password-protected
              rooms. Core features include: end-to-end encrypted file storage, optional NDA gating,
              access logging, and the ability to revoke shared links. We reserve the right to modify,
              suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          <Separator />

          <section>
            <h2>3. Account registration</h2>
            <p>
              Access to OpenDataRoom.requires account registration. You must provide a valid email address
              and complete login via a one-time code. You are responsible for keeping your login
              credentials secure and for all activity that occurs under your account. You must notify
              us immediately of any unauthorised use.
            </p>
          </section>

          <Separator />

          <section>
            <h2>4. Acceptable use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Upload or share any content that is illegal, harmful, or infringing</li>
              <li>
                Share content containing personal data of third parties without their consent or a
                lawful basis
              </li>
              <li>Attempt to reverse-engineer, decrypt, or circumvent the encryption mechanisms</li>
              <li>Use the Service to distribute malware or other malicious code</li>
              <li>Harass, defame, or threaten other users or third parties</li>
              <li>Violate any applicable law or regulation in your jurisdiction</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2>5. Your content</h2>
            <p>
              You retain full ownership of all content you upload to OpenDataRoom.("Your Content"). By using
              the Service, you grant us a limited licence to process, store, and transmit Your Content
              solely as necessary to provide the Service to you.
            </p>
            <p>
              You are solely responsible for ensuring you have all necessary rights, consents, and
              lawful bases before uploading any content. We do not claim any ownership over Your
              Content.
            </p>
            <p>
              <strong>Encryption:</strong> Files you upload are encrypted client-side before storage.
              You control the encryption password. We cannot decrypt your files, access your plaintext
              content, or recover your password.
            </p>
          </section>

          <Separator />

          <section>
            <h2>6. Recipients and shared access</h2>
            <p>
              When you share a room with a third party ("Recipient"), you are responsible for
              ensuring the Recipient's email address is accurate and that sharing the content with them
              is lawful. You must obtain any required consents before sharing personal data about third
              parties.
            </p>
            <p>
              You may configure expiry dates, view-only restrictions, and revocation for any shared
              link. Once revoked, the Recipient's access is immediately terminated.
            </p>
          </section>

          <Separator />

          <section>
            <h2>7. Fees and billing</h2>
            <p>
              Certain features require a paid subscription. Fees are billed in advance on a monthly or
              annual basis. All fees are non-refundable except as required by law. We reserve the
              right to change pricing with 30 days' notice before the start of your next billing
              period.
            </p>
            <p>
              If you cancel a paid plan, your subscription continues until the end of the current
              billing period. Your plan limits revert to the Free tier at the start of the next
              period.
            </p>
          </section>

          <Separator />

          <section>
            <h2>8. Service availability</h2>
            <p>
              We endeavour to keep the Service available 99.9% of the time but do not guarantee
              uninterrupted access. We may perform scheduled or emergency maintenance at any time.
              We are not liable for any downtime or data loss arising from circumstances beyond our
              reasonable control, including force majeure events, third-party infrastructure failures,
              or acts of third parties.
            </p>
          </section>

          <Separator />

          <section>
            <h2>9. Termination</h2>
            <p>
              You may delete your account and all associated data at any time from your workspace
              settings. Upon deletion, all rooms, files, and access records associated with your
              account are permanently removed within 30 days.
            </p>
            <p>
              We may suspend or terminate your account immediately and without notice if you breach
              these Terms, engage in illegal activity, or if we are required to do so by law. We
              reserve the right to delete all data associated with a terminated account in accordance
              with our data retention policy.
            </p>
          </section>

          <Separator />

          <section>
            <h2>10. Disclaimer of warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind,
              either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement. We do not
              warrant that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <Separator />

          <section>
            <h2>11. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, OpenDataRoom.and its officers, employees, and agents
              shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising out of or related to your use of the Service, including but not limited
              to loss of data, loss of revenue, loss of profits, or cost of replacement services,
              even if we have been advised of the possibility of such damages.
            </p>
            <p>
              Our total aggregate liability in connection with the Service shall not exceed the amount
              of fees paid by you to us in the 12 months preceding the event giving rise to liability.
            </p>
          </section>

          <Separator />

          <section>
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless OpenDataRoom.and its officers, employees,
              and agents from and against any and all claims, liabilities, damages, losses, and
              expenses (including reasonable legal fees) arising out of or related to: (a) your breach
              of these Terms; (b) your content or your use of the Service; or (c) any third-party
              claim related to content you shared through the Service.
            </p>
          </section>

          <Separator />

          <section>
            <h2>13. Intellectual property</h2>
            <p>
              OpenDataRoom, its logos, design, and all original content on the website are owned by OpenDataRoom
              or its licensors and may not be reproduced, duplicated, or used without our written
              permission. All other trademarks mentioned are the property of their respective owners.
            </p>
          </section>

          <Separator />

          <section>
            <h2>14. Governing law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              jurisdiction in which OpenDataRoom.is registered, without regard to its conflict of law
              provisions. Any disputes arising from these Terms shall be subject to the exclusive
              jurisdiction of the courts of that jurisdiction.
            </p>
          </section>

          <Separator />

          <section>
            <h2>15. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. We will post the updated version on this
              page with a revised "Last updated" date. Material changes will be notified by email to
              active account holders. Continued use of the Service after changes take effect
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2>16. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <span className="font-mono text-sm">legal@dataroom.app</span>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-8 text-sm text-[var(--odr-text-fine)]">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/dpa" className="hover:text-foreground">
            DPA
          </Link>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
