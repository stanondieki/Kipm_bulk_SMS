"use client";

import { useEffect } from "react";
import { AlertTriangle, Send, X } from "lucide-react";

interface ConfirmSendDialogProps {
  open: boolean;
  recipientCount: number;
  invalidCount: number;
  segments: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSendDialog({
  open,
  recipientCount,
  invalidCount,
  segments,
  onConfirm,
  onCancel,
}: ConfirmSendDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-scale-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Send className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-base font-semibold text-slate-900">Send this SMS now?</h3>
        <p className="mt-1.5 text-sm text-slate-500">
          You&apos;re about to send{" "}
          <span className="font-medium text-slate-700">
            {segments} segment{segments === 1 ? "" : "s"} per recipient
          </span>{" "}
          to{" "}
          <span className="font-semibold text-indigo-600">
            {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
          </span>
          .
        </p>

        {invalidCount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {invalidCount} number{invalidCount === 1 ? "" : "s"} couldn&apos;t be parsed and will
              be skipped.
            </span>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            Send now
          </button>
        </div>
      </div>
    </div>
  );
}
