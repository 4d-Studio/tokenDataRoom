import { DEFAULT_EXPIRATION_DAYS } from "@/lib/filmia/types";

export const buildDefaultNdaText = (companyName?: string) => {
  const disclosingCompany = companyName?.trim() || "The disclosing company";

  return `${disclosingCompany}
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into by and between ${disclosingCompany} and the reviewing party identified in the Filmia acceptance record below (the "Reviewer"). Each may be referred to individually as a "Party" and collectively as the "Parties." The Parties wish to explore a potential business opportunity of mutual interest (the "Opportunity") and exchange confidential information in connection with that Opportunity.

"Confidential Information" means any non-public information disclosed by one Party (the "Discloser") to the other Party (the "Recipient"), whether directly or indirectly, that is marked confidential or should reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information does not include information that: (i) is or becomes publicly available without breach of this Agreement; (ii) was already in the Recipient's lawful possession without restriction before disclosure; or (iii) is lawfully obtained from a third party without breach of any duty of confidentiality.

The Recipient will: (a) use the Confidential Information solely to evaluate the Opportunity; (b) restrict disclosure of Confidential Information to employees, agents, attorneys, accountants, financing sources, and other representatives who need to know it for the Opportunity and who are bound by confidentiality obligations at least as protective as those in this Agreement; and (c) protect the Confidential Information using reasonable care, and no less than the care used to protect its own confidential information of similar importance. The Recipient will promptly notify the Discloser of any unauthorized use or disclosure of Confidential Information of which it becomes aware.

The Recipient may disclose Confidential Information only if legally compelled to do so, and then only after giving the Discloser prompt written notice, if legally permitted, so the Discloser may seek a protective order or other appropriate remedy. All documents, files, materials, and other tangible embodiments of Confidential Information remain the property of the Discloser and must be returned or destroyed promptly upon written request, together with certification of destruction if requested.

All Confidential Information is provided "AS IS" without warranty of any kind. Nothing in this Agreement grants the Recipient any license or other rights under any patent, copyright, trademark, trade secret, or other intellectual property right of the Discloser except the limited right to review the Confidential Information for the Opportunity. The Recipient acknowledges that unauthorized use or disclosure of Confidential Information may cause irreparable harm, and the Discloser is entitled to seek injunctive relief in addition to any other remedies available at law or in equity.

This Agreement starts on the date the Reviewer accepts it electronically in Filmia and continues for one (1) year. The Recipient's confidentiality obligations continue for three (3) years after termination of this Agreement, except for trade secrets, which must be protected for so long as they remain trade secrets under applicable law. Nothing in this Agreement obligates either Party to proceed with any transaction or relationship.

This Agreement is the complete agreement between the Parties concerning the subject matter above and may be modified only in a signed writing by both Parties. If any provision is held unenforceable, the remaining provisions will remain in full force and effect. This Agreement is governed by the laws of the State of California, without regard to conflicts of law rules, and the Parties consent to the exclusive jurisdiction of the state and federal courts located in San Francisco, California.

By accepting this Agreement in Filmia, the Reviewer represents that the signer is authorized to bind the reviewing party identified in the acceptance record and agrees that electronic acceptance and electronic delivery of a signed copy of this Agreement are legally effective.`;
};

export const DEFAULT_NDA_TEXT = buildDefaultNdaText();

export const createPublicSlug = () =>
  `fm-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export const createOwnerKey = () =>
  crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

export const addDays = (days: number = DEFAULT_EXPIRATION_DAYS) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const isVaultExpired = (expiresAt: string) =>
  Date.now() > new Date(expiresAt).getTime();

export const formatBytes = (value: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const getBaseUrlFromHeaders = (headerMap: { get(name: string): string | null }) => {
  const host = headerMap.get("x-forwarded-host") ?? headerMap.get("host") ?? "localhost:3000";
  const protocol =
    headerMap.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
};

export const getClientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip") ??
  undefined;
