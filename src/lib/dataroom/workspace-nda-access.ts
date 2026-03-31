import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "odr_ws_nda_";
const WORKSPACE_NDA_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type WorkspaceNdaPayload = {
  workspaceId: string;
  acceptanceId: string;
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
  signerAddress: string;
  signatureName: string;
  ndaVersion: string;
  acceptedAt: string;
};

const getSecret = () =>
  process.env.ODR_APP_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "opendataroom-local-dev-secret";

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string) =>
  createHmac("sha256", getSecret()).update(value).digest("base64url");

export const workspaceNdaCookieName = (workspaceId: string) =>
  `${COOKIE_PREFIX}${workspaceId}`;

export const createWorkspaceNdaToken = (payload: WorkspaceNdaPayload) => {
  const body = encode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
};

export const verifyWorkspaceNdaToken = (
  token: string | undefined,
  workspaceId: string,
) => {
  if (!token) return null;

  const [body, signature] = token.split(".");

  if (!body || !signature) return null;

  const expectedSignature = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(body)) as WorkspaceNdaPayload;

    if (payload.workspaceId !== workspaceId) return null;

    return payload;
  } catch {
    return null;
  }
};

export const workspaceNdaCookieOptions = {
  httpOnly: true,
  maxAge: WORKSPACE_NDA_TOKEN_TTL_SECONDS,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const WORKSPACE_NDA_VERSION = "filmia-workspace-nda-v1";
