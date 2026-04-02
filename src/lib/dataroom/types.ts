import { z } from "zod";

export const FILE_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;
/** Server-side cap for ciphertext uploads (AES-GCM expansion + margin). */
export const ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES = 32 * 1024 * 1024;
export const DEFAULT_EXPIRATION_DAYS = 14;

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
export type VaultEventType =
  | "created"
  | "viewed"
  | "nda_accepted"
  | "downloaded"
  | "signed_nda_downloaded"
  | "revoked"
  | "reactivated"
  | "document_attached";

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
};

export type VaultAcceptanceRecord = {
  id: string;
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
  requiresNda: boolean;
  ndaText?: string;
  ndaVersion: string;
  status: VaultStatus;
  createdAt: string;
  expiresAt: string;
  /** When false, no encrypted payload yet (owner uploads on manage page). Omitted on older vaults = has document. */
  hasEncryptedFile?: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  salt: string;
  iv: string;
  pbkdf2Iterations: number;
};

/** True if the room has an encrypted document for recipients (legacy vaults without the flag count as true). */
export const vaultHasEncryptedDocument = (metadata: VaultRecord): boolean =>
  metadata.hasEncryptedFile !== false;

export const isSupportedFileType = (mimeType: string) =>
  SUPPORTED_FILE_TYPES.includes(mimeType as SupportedFileType);

export const createEvent = (
  type: VaultEventType,
  details: Omit<VaultEvent, "id" | "occurredAt" | "type"> = {},
): VaultEvent => ({
  id: crypto.randomUUID(),
  type,
  occurredAt: new Date().toISOString(),
  ...details,
});
