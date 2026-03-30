"use client";

import { useEffect, useRef, useState, useTransition } from "react";

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
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step === "code") {
      codeInputRefs.current[0]?.focus();
    }
  }, [step]);

  const setCodeDigit = (index: number, value: string) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    const digits = Array.from({ length: CODE_LENGTH }, (_, digitIndex) => code[digitIndex] ?? "");

    digits[index] = nextDigit;
    const nextCode = digits.join("");
    setCode(nextCode);

    if (nextDigit && index < CODE_LENGTH - 1) {
      codeInputRefs.current[index + 1]?.focus();
      codeInputRefs.current[index + 1]?.select();
    }
  };

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (code[index]) {
        const digits = Array.from(
          { length: CODE_LENGTH },
          (_, digitIndex) => code[digitIndex] ?? "",
        );
        digits[index] = "";
        setCode(digits.join(""));
        return;
      }

      if (index > 0) {
        const digits = Array.from(
          { length: CODE_LENGTH },
          (_, digitIndex) => code[digitIndex] ?? "",
        );
        digits[index - 1] = "";
        setCode(digits.join(""));
        codeInputRefs.current[index - 1]?.focus();
        codeInputRefs.current[index - 1]?.select();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);

    if (!pastedDigits) {
      return;
    }

    setCode(pastedDigits);
    const focusIndex = Math.min(pastedDigits.length, CODE_LENGTH - 1);
    codeInputRefs.current[focusIndex]?.focus();
    codeInputRefs.current[focusIndex]?.select();
  };

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
        ? "Local dev mode: use the code shown below."
        : "Check your email for the Filmia code.",
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
    <section className="surface-panel max-w-xl p-6 sm:p-8">
      <p className="eyebrow">Login first</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
        Sign in with a magic code
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
        We’ll use email codes so there’s no password to remember. After login, the first
        step is creating your workspace.
      </p>

      <div className="mt-8 space-y-5">
        <label className="space-y-2">
          <span className="label-title">Work email</span>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>

        {step === "code" ? (
          <div className="space-y-3">
            <span className="label-title">Magic code</span>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  aria-label={`Digit ${index + 1}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="h-14 rounded-[1rem] border border-[rgba(16,24,40,0.12)] bg-white text-center text-xl font-semibold tracking-[0.08em] text-[var(--color-ink)] outline-none transition focus:border-[rgba(52,93,255,0.45)]"
                  inputMode="numeric"
                  maxLength={1}
                  pattern="[0-9]*"
                  value={code[index] ?? ""}
                  onChange={(event) => setCodeDigit(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  onFocus={(event) => event.currentTarget.select()}
                  onPaste={handleCodePaste}
                />
              ))}
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              Enter the 6-digit code we sent to {email}.
            </p>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-[1rem] border border-[rgba(52,93,255,0.2)] bg-[rgba(52,93,255,0.05)] px-4 py-3 text-sm text-[var(--color-foreground)]">
            {message}
            {debugCode ? <div className="mt-2 font-semibold">Code: {debugCode}</div> : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1rem] border border-[#f1b8ae] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f3d2f]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {step === "email" ? (
            <button
              type="button"
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
              className="hero-cta-primary"
            >
              Send code
            </button>
          ) : (
            <>
              <button
                type="button"
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
                className="hero-cta-primary"
              >
                Continue
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setMessage("");
                  setError("");
                }}
                className="hero-cta-secondary"
              >
                Change email
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
