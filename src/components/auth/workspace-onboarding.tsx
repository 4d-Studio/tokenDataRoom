"use client";

import { useState, useTransition } from "react";

export const WorkspaceOnboarding = ({ email }: { email: string }) => {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const createWorkspace = async () => {
    setError("");

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, companyName }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to create workspace.");
    }

    window.location.href = "/workspace";
  };

  return (
    <section className="surface-panel max-w-xl p-6 sm:p-8">
      <p className="eyebrow">Workspace first</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
        Create your Filmia workspace
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
        Signed in as {email}. Give your workspace a simple name so new rooms have a clean
        home from the start.
      </p>

      <div className="mt-8 space-y-5">
        <label className="space-y-2">
          <span className="label-title">Workspace name</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Northlight"
          />
        </label>
        <label className="space-y-2">
          <span className="label-title">Company</span>
          <input
            className="field-input"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Northlight Labs"
          />
        </label>

        {error ? (
          <div className="rounded-[1rem] border border-[#f1b8ae] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f3d2f]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              void createWorkspace().catch((caughtError: unknown) => {
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to create workspace.",
                );
              });
            })
          }
          className="hero-cta-primary"
        >
          Create workspace
        </button>
      </div>
    </section>
  );
};
