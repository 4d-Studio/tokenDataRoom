"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  FileText,
  Lock,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { CreateRoomPreviewSheet } from "@/components/dataroom/create-room-preview-sheet";
import {
  productFieldClass,
  productTextareaClass,
} from "@/components/dataroom/product-ui";
import { encryptFile } from "@/lib/dataroom/client-crypto";
import { DEFAULT_EXPIRATION_DAYS, FILE_SIZE_LIMIT_BYTES } from "@/lib/dataroom/types";

type CreationResult = {
  slug: string;
  shareUrl: string;
  manageUrl: string;
};

const EXPIRATION_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const STEPS = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "protect", label: "Protect", icon: Lock },
  { id: "details", label: "Details", icon: Users },
];

// ─── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = completed.has(i);
        const active = i === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                done
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "border-border bg-muted text-[var(--odr-text-fine)]"
              }`}
            >
              {done ? <CheckSquare className="size-4" /> : <Icon className="size-4" />}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                active || done ? "text-foreground" : "text-[var(--odr-text-fine)]"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-3 h-px w-8 ${done ? "bg-[var(--color-accent)]" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload ────────────────────────────────────────────────────────────
function UploadStep({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Add a document</h2>
        <p className="mt-1 text-sm text-[var(--odr-text-support)]">
          Upload the file you want to share. PDFs, decks, images, and contracts all work.
        </p>
      </div>

      <label className="upload-zone flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-center transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5">
        <Upload className="size-8 text-[var(--odr-text-fine)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {file ? file.name : "Drop your file here"}
          </p>
          {file && (
            <p className="mt-0.5 text-xs text-[var(--odr-text-support)]">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
          {!file && (
            <p className="mt-0.5 text-xs text-[var(--odr-text-support)]">
              PDF, deck, image — up to 25 MB
            </p>
          )}
        </div>
        <input
          className="sr-only"
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

// ─── Step 2: Protect ──────────────────────────────────────────────────────────
function ProtectStep({
  title,
  password,
  onTitleChange,
  onPasswordChange,
}: {
  title: string;
  password: string;
  onTitleChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Protect the room</h2>
        <p className="mt-1 text-sm text-[var(--odr-text-support)]">
          Give the room a title and set a password. Only recipients with the password can open the file.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="step-title">Room title</FieldLabel>
          <Input
            id="step-title"
            autoComplete="off"
            className={productFieldClass}
            placeholder="Q2 investor update"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="step-password">Password</FieldLabel>
          <Input
            id="step-password"
            autoComplete="new-password"
            spellCheck={false}
            className={productFieldClass}
            placeholder="Min. 8 characters"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" />
        <p className="text-sm text-[var(--odr-text-support)]">
          Your file is encrypted with AES-256 in this browser before it reaches our servers.
          We never see the password or the plaintext file.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Details ─────────────────────────────────────────────────────────
function DetailsStep({
  senderName,
  senderCompany,
  message,
  expiresInDays,
  requiresNda,
  ndaText,
  defaultNdaText,
  onSenderNameChange,
  onSenderCompanyChange,
  onMessageChange,
  onExpiresChange,
  onRequiresNdaChange,
  onNdaTextChange,
  onResetNda,
}: {
  senderName: string;
  senderCompany: string;
  message: string;
  expiresInDays: number;
  requiresNda: boolean;
  ndaText: string;
  defaultNdaText: string;
  onSenderNameChange: (v: string) => void;
  onSenderCompanyChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onExpiresChange: (v: number) => void;
  onRequiresNdaChange: (v: boolean) => void;
  onNdaTextChange: (v: string) => void;
  onResetNda: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Room details</h2>
        <p className="mt-1 text-sm text-[var(--odr-text-support)]">
          Optional. Help recipients understand who sent the room and why.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="step-sender-name">Your name</FieldLabel>
          <Input
            id="step-sender-name"
            autoComplete="name"
            className={productFieldClass}
            placeholder="Ava Chen"
            value={senderName}
            onChange={(e) => onSenderNameChange(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="step-sender-company">Company</FieldLabel>
          <Input
            id="step-sender-company"
            autoComplete="organization"
            className={productFieldClass}
            placeholder="Northlight Labs"
            value={senderCompany}
            onChange={(e) => onSenderCompanyChange(e.target.value)}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="step-message">Note to recipient</FieldLabel>
        <Textarea
          id="step-message"
          className={`${productTextareaClass} min-h-20`}
          placeholder="Add context or review instructions for the recipient."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="step-expiry">Expires</FieldLabel>
          <NativeSelect
            id="step-expiry"
            className="w-full"
            value={expiresInDays}
            onChange={(e) => onExpiresChange(Number(e.target.value))}
          >
            {EXPIRATION_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>NDA</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            className="w-full"
            value={requiresNda ? "required" : "optional"}
            onValueChange={(v) => {
              if (v === "required") onRequiresNdaChange(true);
              if (v === "optional") onRequiresNdaChange(false);
            }}
          >
            <ToggleGroupItem value="required" className="flex-1">
              Required
            </ToggleGroupItem>
            <ToggleGroupItem value="optional" className="flex-1">
              Optional
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
      </div>

      {requiresNda && (
        <Field>
          <FieldLabel htmlFor="step-nda">NDA text</FieldLabel>
          <Textarea
            id="step-nda"
            className={`${productTextareaClass} min-h-32`}
            value={ndaText || defaultNdaText}
            onChange={(e) => onNdaTextChange(e.target.value)}
          />
          <Button
            type="button"
            variant="link"
            onClick={onResetNda}
            className="h-auto w-fit p-0 text-sm"
          >
            Reset to default
          </Button>
        </Field>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export const CreateVaultForm = ({
  userPlan,
  currentRoomCount,
  defaultNdaText,
  defaultSenderCompany,
  defaultSenderName,
}: {
  userPlan: "free" | "plus" | "unicorn";
  currentRoomCount: number;
  defaultNdaText: string;
  defaultSenderCompany: string;
  defaultSenderName: string;
}) => {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderCompany, setSenderCompany] = useState(defaultSenderCompany);
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_EXPIRATION_DAYS);
  const [requiresNda, setRequiresNda] = useState(true);
  const [ndaText, setNdaText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreationResult | null>(null);

  const isFree = userPlan === "free" && currentRoomCount >= 3;

  const canNext = () => {
    if (step === 0) return file !== null;
    if (step === 1) return title.trim().length > 0 && password.length >= 8;
    return true;
  };

  const advance = () => {
    if (!canNext()) return;
    setCompleted((prev) => new Set([...prev, step]));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (!file) return;

    setError("");
    const effSenderName = senderName.trim() || defaultSenderName || "OpenDataRoom workspace";
    const effSenderCompany = senderCompany.trim() || defaultSenderCompany;
    const effNdaText = ndaText ? ndaText : defaultNdaText;

    startTransition(async () => {
      try {
        const encryptionResult = await encryptFile(file, password);

        const formData = new FormData();
        formData.append(
          "encryptedFile",
          new File([encryptionResult.encryptedBytes], `${file.name}.filmia`, {
            type: "application/octet-stream",
          }),
        );
        formData.append(
          "metadata",
          JSON.stringify({
            title,
            senderName: effSenderName,
            senderCompany: effSenderCompany,
            message,
            requiresNda,
            ndaText: effNdaText,
            expiresInDays,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            salt: encryptionResult.salt,
            iv: encryptionResult.iv,
            pbkdf2Iterations: encryptionResult.pbkdf2Iterations,
          }),
        );

        const response = await fetch("/api/vaults", { method: "POST", body: formData });
        const payload = (await response.json()) as CreationResult & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not create the room.");
        }

        setResult(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  // ── Free plan gate ─────────────────────────────────────────────────────
  if (isFree) {
    return (
      <Card className="rounded-2xl border border-border bg-white p-6">
        <p className="font-semibold text-foreground">Free plan limit reached</p>
        <p className="mt-1 text-sm text-[var(--odr-text-support)]">
          Your Free plan allows 3 rooms. Upgrade to create more.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/pricing">See Plus plan — $9.99/month</Link>
        </Button>
      </Card>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Card className="rounded-2xl border border-border bg-white p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold text-foreground">Room created</p>
              <p className="mt-1 text-sm text-[var(--odr-text-support)]">
                Share the link and password separately. Keep the management link private.
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--odr-text-fine)]">
            Share link
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate text-sm">{result.shareUrl}</code>
            <CopyButton value={result.shareUrl} />
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--odr-text-fine)]">
            Management link
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate text-sm">{result.manageUrl}</code>
            <CopyButton value={result.manageUrl} />
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={result.manageUrl}>Open room controls →</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // ── Step wizard ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-8">
      <StepIndicator current={step} completed={completed} />

      <Card className="rounded-2xl border border-border bg-white">
        <CardContent className="p-6">
          {step === 0 && <UploadStep file={file} onFileChange={setFile} />}
          {step === 1 && (
            <ProtectStep
              title={title}
              password={password}
              onTitleChange={setTitle}
              onPasswordChange={setPassword}
            />
          )}
          {step === 2 && (
            <DetailsStep
              senderName={senderName}
              senderCompany={senderCompany}
              message={message}
              expiresInDays={expiresInDays}
              requiresNda={requiresNda}
              ndaText={ndaText}
              defaultNdaText={defaultNdaText}
              onSenderNameChange={setSenderName}
              onSenderCompanyChange={setSenderCompany}
              onMessageChange={setMessage}
              onExpiresChange={setExpiresInDays}
              onRequiresNdaChange={setRequiresNda}
              onNdaTextChange={setNdaText}
              onResetNda={() => setNdaText("")}
            />
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Could not create room</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={back}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={advance} disabled={!canNext()}>
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => startTransition(submit)} disabled={isPending}>
              {isPending ? "Creating…" : "Create room"}
              {!isPending && <ArrowRight className="size-4" />}
            </Button>
          )}
        </div>

        {step < STEPS.length - 1 && (
          <CreateRoomPreviewSheet
            fileName={file?.name ?? null}
            title={title}
            senderName={senderName}
            senderCompany={senderCompany}
            message={message}
            requiresNda={requiresNda}
            ndaText={ndaText}
            defaultNdaText={defaultNdaText}
            ndaCustomized={!!ndaText}
          />
        )}
      </div>
    </div>
  );
};
