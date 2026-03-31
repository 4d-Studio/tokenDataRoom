"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor, isRichNdaContent, plainTextToHtml } from "@/components/dataroom/rich-text-editor";

function ensureHtml(text: string): string {
  return isRichNdaContent(text) ? text : plainTextToHtml(text);
}

export function NdaTemplateEditor({
  savedTemplate,
  defaultTemplate,
  companyName,
}: {
  savedTemplate: string;
  defaultTemplate: string;
  companyName: string;
}) {
  const defaultHtml = useRef(ensureHtml(defaultTemplate));
  const initialHtml = savedTemplate ? ensureHtml(savedTemplate) : defaultHtml.current;

  const [html, setHtml] = useState(initialHtml);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editorKey, setEditorKey] = useState(0);

  const isCustom = html.trim() !== defaultHtml.current.trim();
  const isDirty = html.trim() !== initialHtml.trim();

  const save = async () => {
    setError("");
    setSaved(false);
    const res = await fetch("/api/workspace/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ndaTemplate: isCustom ? html : "" }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to save");
    }
    setSaved(true);
  };

  const handleSave = () =>
    startTransition(() => {
      void save().catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to save");
      });
    });

  const handleReset = () => {
    setHtml(defaultHtml.current);
    setEditorKey((k) => k + 1);
    setSaved(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confidentiality agreement</CardTitle>
        <CardDescription>
          This template is shown to recipients before they can access your data rooms.
          It includes {companyName} as the disclosing party by default.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {saved ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>
              Your NDA template has been updated. New rooms will use this text.
            </AlertDescription>
          </Alert>
        ) : null}

        <RichTextEditor
          key={editorKey}
          content={html}
          onChange={(value) => {
            setHtml(value);
            setSaved(false);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={isPending || !isDirty}>
            {isPending ? "Saving…" : "Save template"}
          </Button>
          {isCustom ? (
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="size-4" />
              Reset to default
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {isCustom ? "Custom template" : "Using default template"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
