import { z } from "zod";

export const FILE_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;
/** Server-side cap for ciphertext uploads (AES-GCM expansion + margin). */
export const ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES = 32 * 1024 * 1024;
export const DEFAULT_EXPIRATION_DAYS = 14;

/** Unencrypted share-page banner (image). Bytes stored separately; served via GET …/share-banner. */
export const SHARE_BANNER_MAX_BYTES = 3 * 1024 * 1024;

export type ShareBannerMeta = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "text/plain",
] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

/** Room + NDA settings only; document is added later on the owner page. */
export const createVaultRoomSchema = z.object({
  title: z.string().trim().min(3).max(80),
  senderName: z.string().trim().min(2).max(60),
  senderCompany: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().max(240).optional().default(""),
  requiresNda: z.boolean(),
  ndaText: z.string().trim().max(8_000).optional().default(""),
  expiresInDays: z.number().int().min(1).max(90).default(DEFAULT_EXPIRATION_DAYS),
});

export const createVaultSchema = z.object({
  title: z.string().trim().min(3).max(80),
  senderName: z.string().trim().min(2).max(60),
  senderCompany: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().max(240).optional().default(""),
  requiresNda: z.boolean(),
  ndaText: z.string().trim().max(8_000).optional().default(""),
  expiresInDays: z.number().int().min(1).max(90).default(DEFAULT_EXPIRATION_DAYS),
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(1).max(160),
  fileSize: z.number().int().positive().max(FILE_SIZE_LIMIT_BYTES),
  salt: z.string().min(1),
  iv: z.string().min(1),
  pbkdf2Iterations: z.number().int().min(100_000).max(500_000),
});

/** Metadata JSON when attaching the encrypted payload from the owner page. */
export const attachVaultPayloadSchema = z.object({
  ownerKey: z.string().min(32).max(128),
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(1).max(160),
  fileSize: z.number().int().positive().max(FILE_SIZE_LIMIT_BYTES),
  salt: z.string().min(1),
  iv: z.string().min(1),
  pbkdf2Iterations: z.number().int().min(100_000).max(500_000),
});

export const acceptanceSchema = z.object({
  signerName: z.string().trim().min(2).max(60),
  signerEmail: z.string().trim().email().max(120),
  signerCompany: z.string().trim().max(80).optional().default(""),
  signerAddress: z.string().trim().min(10).max(240),
  signatureName: z.string().trim().min(2).max(80),
  signatureImage: z.string().max(500_000).optional(), // base64 PNG data URL
});

/** NDA POST body: ties the access cookie to this browser session (sessionStorage UUID). */
export const acceptanceWithViewerBindingSchema = acceptanceSchema.extend({
  viewerBinding: z.string().uuid(),
});

export const viewerBindingOnlySchema = z.object({
  viewerBinding: z.string().uuid(),
});

export type CreateVaultInput = z.infer<typeof createVaultSchema>;
export type CreateVaultRoomInput = z.infer<typeof createVaultRoomSchema>;
export type AttachVaultPayloadInput = z.infer<typeof attachVaultPayloadSchema>;
export type AcceptanceInput = z.infer<typeof acceptanceSchema>;

export type VaultStatus = "active" | "revoked";

/** Sequential e-sign on a single PDF in the room (invites per signer). */
export type SigningRequestSignerStatus = "pending" | "signed";

export type SigningRequestSigner = {
  id: string;
  email: string;
  name?: string;
  order: number;
  status: SigningRequestSignerStatus;
  signedAt?: string;
  signatureName?: string;
  signatureImage?: string;
};

export type SigningRequestStatus = "active" | "completed" | "voided";

export type SigningRequest = {
  id: string;
  fileId: string;
  message?: string;
  createdAt: string;
  status: SigningRequestStatus;
  signers: SigningRequestSigner[];
  /** Index into signers sorted by `order`; the active signer is at this index when status is active. */
  currentOrderIndex: number;
};

/** Cap stored signing workflows per vault (metadata size). */
export const MAX_SIGNING_REQUESTS_PER_VAULT = 15;

export const MAX_SIGNERS_PER_SIGNING_REQUEST = 5;

export type VaultEventType =
  | "created"
  | "viewed"
  | "nda_accepted"
  | "downloaded"
  | "signed_nda_downloaded"
  | "revoked"
  | "reactivated"
  | "document_attached"
  | "file_renamed"
  | "files_reordered"
  | "access_requested"
  | "access_verified"
  | "files_decrypted"
  | "invite_sent"
  | "document_signing_created"
  | "document_signing_signed"
  | "document_signing_completed"
  | "document_signing_voided";

export type VaultEvent = {
  id: string;
  type: VaultEventType;
  occurredAt: string;
  actorName?: string;
  actorEmail?: string;
  actorCompany?: string;
  actorAddress?: string;
  note?: string;
  userAgent?: string;
  ipAddress?: string;
  /** Parsed device description, e.g. "Chrome on macOS" */
  device?: string;
  /** City from geo headers, e.g. "San Francisco" */
  city?: string;
  /** Region/state, e.g. "California" */
  region?: string;
  /** ISO country code, e.g. "US" */
  country?: string;
};

export type VaultAcceptanceRecord = {
  id: string;
  /** Present when the signer opted into "remember me" — links to tkn_recipient_accounts.id */
  recipientAccountId?: string;
  acceptedAt: string;
  ndaVersion: string;
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
  signerAddress: string;
  signatureName: string;
  signatureImage?: string; // base64 PNG data URL of drawn signature
  userAgent?: string;
  ipAddress?: string;
};

/** Single encrypted file entry within a vault. */
export type VaultFileEntry = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** ISO timestamp when this ciphertext was attached (recipient/owner visibility for diligence). */
  addedAt?: string;
  /** Owner-defined category/section name (e.g. "Agreements", "Pitch deck", "NDAs") */
  category?: string;
  /** Base64-encoded random salt for this file's key derivation */
  salt: string;
  /** Base64-encoded random IV for AES-GCM */
  iv: string;
  pbkdf2Iterations: number;
};

export type VaultRecord = {
  id: string;
  slug: string;
  ownerKey: string;
  ownerUserId?: string;
  workspaceId?: string;
  title: string;
  senderName: string;
  senderCompany?: string;
  message?: string;
  /** Owner-only; never shown on the recipient share page. */
  ownerNotes?: string;
  /**
   * When true, only emails in `allowedRecipientEmails` can request OTP, sign the NDA, or download ciphertext.
   */
  restrictRecipientEmails?: boolean;
  /** Normalized lowercase emails invited by the owner (max 100). */
  allowedRecipientEmails?: string[];
  requiresNda: boolean;
  ndaText?: string;
  ndaVersion: string;
  status: VaultStatus;
  createdAt: string;
  expiresAt: string;
  /**
   * Multi-file array. Present on vaults created after this feature ships.
   * If absent, fall back to the legacy single-file fields below for backward compat.
   */
  vaultFiles?: VaultFileEntry[];
  /** Legacy single-file fields — used as fallback when vaultFiles is absent. */
  hasEncryptedFile?: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  salt: string;
  iv: string;
  pbkdf2Iterations: number;
  /**
   * Public hero image on `/s/[slug]` — not encrypted; visible before NDA/password.
   * Binary at `share-banner.bin` in vault storage.
   */
  shareBanner?: ShareBannerMeta;
  /** Encrypted vault file IDs omitted from recipient manifest and bundle downloads. */
  recipientHiddenVaultFileIds?: string[];
  /**
   * In-room PDF signing workflows (sequential). Invites use signed URLs; completion is recorded here.
   */
  signingRequests?: SigningRequest[];
};

/** True if the vault has at least one encrypted file for recipients. */
export const vaultHasEncryptedDocument = (metadata: VaultRecord): boolean =>
  Boolean(metadata.vaultFiles?.length) || metadata.hasEncryptedFile !== false;

export const isSupportedFileType = (mimeType: string) =>
  SUPPORTED_FILE_TYPES.includes(mimeType as SupportedFileType);

/**
 * Returns the ordered list of file entries for a vault.
 * Uses vaultFiles[] if present; otherwise constructs a single entry from legacy fields
 * so the rest of the codebase stays backward-compatible with existing vaults.
 */
export const vaultFilesList = (metadata: VaultRecord): VaultFileEntry[] => {
  if (metadata.vaultFiles?.length) return metadata.vaultFiles;
  // Legacy single-file vault — construct a synthetic entry from old fields
  if (metadata.hasEncryptedFile === false) return [];
  return [
    {
      id: "legacy-primary",
      name: metadata.fileName,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.fileSize,
      addedAt: metadata.createdAt,
      salt: metadata.salt,
      iv: metadata.iv,
      pbkdf2Iterations: metadata.pbkdf2Iterations,
    },
  ];
};

/** Files shown to recipients on the share link (excludes owner-hidden entries). */
export const recipientVisibleVaultFiles = (metadata: VaultRecord): VaultFileEntry[] => {
  const all = vaultFilesList(metadata);
  const hidden = new Set(metadata.recipientHiddenVaultFileIds ?? []);
  return all.filter((f) => !hidden.has(f.id));
};

export const vaultHasRecipientVisibleDocument = (metadata: VaultRecord): boolean =>
  recipientVisibleVaultFiles(metadata).length > 0;

export const createEvent = (
  type: VaultEventType,
  details: Omit<VaultEvent, "id" | "occurredAt" | "type"> = {},
): VaultEvent => ({
  id: crypto.randomUUID(),
  type,
  occurredAt: new Date().toISOString(),
  ...details,
});
