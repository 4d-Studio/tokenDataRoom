"use client";

import { useState, useTransition } from "react";
import { AlertCircleIcon, KeyRoundIcon, MailIcon } from "lucide-react";

import { productFieldClass } from "@/components/dataroom/product-ui";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const requestCode = async () => {
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
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
    setMessage(
      payload.delivery === "local"
        ? "Local dev mode is active for this workspace."
        : "Check your inbox for the Token sign-in code.",
    );
    setStep("code");
  };

  const verifyCode = async () => {
    setError("");

    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, code }),
    });

    const payload = (await response.json()) as VerifyPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to verify code.");
    }

    window.location.href = payload.hasWorkspace ? "/workspace" : "/onboarding";
  };

  return (
    <Card className="tkn-elevated-panel w-full rounded-2xl border border-[var(--tkn-panel-border)] py-0 shadow-none ring-0">
      <CardHeader className="gap-2 border-b px-5 py-4">
        <div className="eyebrow">Login first</div>
        <CardTitle className="text-balance text-[1.65rem] tracking-[-0.04em] text-[var(--color-ink)] sm:text-[1.8rem]">
          Sign in with a magic code
        </CardTitle>
        <CardDescription className="max-w-lg text-[0.94rem] leading-6.5">
          We’ll email a one-time code so there’s no password to manage. After login,
          the first step is creating your workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5">
        <FieldGroup className="gap-4">
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

          {step === "code" ? (
            <Field>
              <FieldLabel>Magic code</FieldLabel>
              <div className="flex flex-col gap-2">
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
                <p className="text-[0.9rem] leading-6 text-muted-foreground">
                  Enter the 6-digit code we sent to {email}.
                </p>
              </div>
            </Field>
          ) : null}

          {message ? (
            <Alert className="border-border bg-accent/50">
              <KeyRoundIcon />
              <AlertTitle>Code ready</AlertTitle>
              <AlertDescription>
                {message}
                {debugCode ? (
                  <div className="mt-2 font-semibold text-foreground">Code: {debugCode}</div>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {step === "email" ? (
              <Button
                type="button"
                size="lg"
                className="min-w-36"
                disabled={isPending}
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
                Send sign-in code
              </Button>
            ) : (
              <>
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
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-w-32"
                  disabled={isPending}
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setMessage("");
                    setError("");
                  }}
                >
                  Change email
                </Button>
              </>
            )}
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
