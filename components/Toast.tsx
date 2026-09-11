"use client";

import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  tone: "success" | "error";
  onClose: () => void;
  durationMs?: number;
}

export function Toast({ message, tone, onClose, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [onClose, durationMs, message]);

  const isSuccess = tone === "success";

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 animate-fade-in-up">
      <div
        role="status"
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
          isSuccess ? "bg-slate-900" : "bg-red-600"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 flex-shrink-0" />
        )}
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
