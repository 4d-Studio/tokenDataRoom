"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountCard() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        setDeleting(false);
      }
    } catch {
      setError("Network error. Please check your connection.");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <div className="label-title text-red-600">Delete account</div>
          <p className="odr-support mt-1">
            Permanently delete your account and all associated data — your workspace, all rooms,
            files, access logs, and NDA records. This action cannot be undone.
          </p>

          <div className="mt-4">
            <label className="odr-fine mb-1.5 block">
              Type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="max-w-xs border-red-200 focus-visible:ring-red-400"
            />
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <Button
            variant="destructive"
            size="sm"
            className="mt-4"
            disabled={confirmText !== "DELETE" || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
