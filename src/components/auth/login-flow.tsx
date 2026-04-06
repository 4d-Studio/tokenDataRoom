"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircleIcon, MailIcon } from "lucide-react";

import { productFieldClass } from "@/components/dataroom/product-ui";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type VerifyPayload = {
  hasWorkspace: boolean;
};

const CODE_LENGTH = 6;

export const LoginFlow = () => {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const requestCode = async () => {
    setError("");
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as {
      error?: string;
      debugCode?: string;
      delivery?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to send code.");
    }

    setDebugCode(payload.debugCode ?? null);
    setStep("code");
    setResendCooldown(30);
  };

  const verifyCode = async () => {
    setError("");
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const payload = (await response.json()) as VerifyPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to verify code.");
    }

    window.location.href = payload.hasWorkspace ? "/workspace" : "/onboarding";
  };

  return (
    <div className="w-full">
      <h1 className="text-[1.65rem] font-bold tracking-[-0.04em] text-[var(--color-ink)]">
        {step === "email" ? "Sign in" : "Check your inbox"}
      </h1>

      {step === "code" && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a code to <span className="font-medium text-foreground">{email}</span>.
          <button
            type="button"
            className="ml-2 text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Change email
          </button>
        </p>
      )}

      <FieldGroup className="mt-6 gap-4">
        <Field>
          <FieldLabel htmlFor="login-email">Work email</FieldLabel>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              className={`${productFieldClass} pl-10`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
        </Field>

        {step === "code" && (
          <Field>
            <FieldLabel>Magic code</FieldLabel>
            <InputOTP
              autoFocus
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
              containerClassName="justify-start"
            >
              <InputOTPGroup className="gap-2 border-0 bg-transparent">
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="size-11 rounded-xl border border-border bg-white text-base font-semibold text-[var(--color-ink)] first:rounded-xl first:border last:rounded-xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Didn&apos;t receive it? Check your spam folder, or resend after{" "}
              {resendCooldown > 0 ? (
                <span>{resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() =>
                    startTransition(() => {
                      void requestCode().catch((e: unknown) => {
                        setError(e instanceof Error ? e.message : "Unable to resend.");
                      });
                    })
                  }
                >
                  30 seconds
                </button>
              )}
              .
            </p>
          </Field>
        )}

        {debugCode && process.env.NODE_ENV === "development" ? (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground">
            Dev: {debugCode}
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-2">
          {step === "email" ? (
            <Button
              type="button"
              size="lg"
              className="min-w-36"
              disabled={isPending || !email.trim()}
              onClick={() =>
                startTransition(() => {
                  void requestCode().catch((caughtError: unknown) => {
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Unable to send code.",
                    );
                  });
                })
              }
            >
              {isPending ? "Sending…" : "Send sign-in code"}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="min-w-32"
              disabled={isPending || code.length !== CODE_LENGTH}
              onClick={() =>
                startTransition(() => {
                  void verifyCode().catch((caughtError: unknown) => {
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Unable to verify code.",
                    );
                  });
                })
              }
            >
              {isPending ? "Verifying…" : "Continue"}
            </Button>
          )}
        </div>
      </FieldGroup>
    </div>
  );
};
