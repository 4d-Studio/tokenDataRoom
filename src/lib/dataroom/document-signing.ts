import type { SigningRequest, SigningRequestSigner } from "@/lib/dataroom/types";

export const sortSigningSigners = (req: SigningRequest): SigningRequestSigner[] =>
  [...req.signers].sort((a, b) => a.order - b.order);

export function getSigningInviteState(req: SigningRequest, signerId: string) {
  const sorted = sortSigningSigners(req);
  const signer = sorted.find((s) => s.id === signerId) ?? null;
  if (!signer) {
    return {
      sorted,
      signer: null as SigningRequestSigner | null,
      phase: "unknown_signer" as const,
      activeSigner: null as SigningRequestSigner | null,
    };
  }

  if (req.status === "voided") {
    return { sorted, signer, phase: "voided" as const, activeSigner: null };
  }

  if (req.status === "completed") {
    return { sorted, signer, phase: "completed" as const, activeSigner: null };
  }

  const activeSigner = sorted[req.currentOrderIndex] ?? null;

  if (signer.status === "signed") {
    return { sorted, signer, phase: "already_signed" as const, activeSigner };
  }

  if (!activeSigner || signer.order !== activeSigner.order) {
    return { sorted, signer, phase: "waiting" as const, activeSigner };
  }

  return { sorted, signer, phase: "ready" as const, activeSigner };
}

export function appendSigningRequest(
  existing: SigningRequest[] | undefined,
  next: SigningRequest,
): SigningRequest[] {
  const list = [...(existing ?? [])];
  list.unshift(next);
  return list;
}
