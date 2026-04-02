"use client";

import { useState, useTransition } from "react";

import { productFieldClass } from "@/components/dataroom/product-ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
    <Card className="tkn-elevated-panel rounded-2xl border border-[var(--tkn-panel-border)] py-0 shadow-none ring-0">
      <CardHeader className="gap-2 border-b px-5 py-4">
        <p className="eyebrow">Workspace first</p>
        <CardTitle className="text-balance text-[1.65rem] tracking-[-0.04em] text-[var(--color-ink)] sm:text-[1.8rem]">
          Create your Token workspace
        </CardTitle>
        <CardDescription className="max-w-lg text-[0.94rem] leading-6.5">
          Signed in as {email}. Give your workspace a simple name so new rooms have a clean
          home from the start.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
            <Input
              id="workspace-name"
              name="workspaceName"
              autoComplete="off"
              className={productFieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Northlight"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="company-name">Company</FieldLabel>
            <Input
              id="company-name"
              name="companyName"
              autoComplete="organization"
              className={productFieldClass}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Northlight Labs"
            />
          </Field>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create workspace</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
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
            size="lg"
            className="w-fit"
          >
            Create workspace
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
