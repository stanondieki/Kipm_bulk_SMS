"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";
import {
  estimateSegments,
  extractNumbersFromText,
  normalizeAndDedupeNumbers,
  splitRecipientInput,
} from "@/lib/phone";
import type { SendResult } from "@/lib/africastalking";
import { ConfirmSendDialog } from "@/components/ConfirmSendDialog";
import { Toast } from "@/components/Toast";

interface SendApiResponse {
  totalRequested: number;
  totalValid: number;
  invalid: string[];
  results: SendResult[];
  errors: string[];
}

export default function Home() {
  const [recipientsText, setRecipientsText] = useState("");
  const [message, setMessage] = useState("");
  const [senderId, setSenderId] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<SendApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    const raw = splitRecipientInput(recipientsText);
    return normalizeAndDedupeNumbers(raw);
  }, [recipientsText]);

  const segmentInfo = useMemo(() => estimateSegments(message), [message]);
  const segmentUsagePct = segmentInfo.segments
    ? Math.min(100, (segmentInfo.charsInCurrentSegment / segmentInfo.segmentCharLimit) * 100)
    : 0;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const numbers = extractNumbersFromText(text);
      setRecipientsText((prev) => {
        const merged = prev.trim() ? `${prev.trim()}\n${numbers.join("\n")}` : numbers.join("\n");
        return merged;
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function requestSend() {
    setError(null);
    setResult(null);

    if (!message.trim()) {
      setError("Please write a message before sending.");
      return;
    }
    if (parsed.valid.length === 0) {
      setError("No valid phone numbers found. Paste or upload numbers first.");
      return;
    }
    setConfirmOpen(true);
  }

  async function performSend() {
    setConfirmOpen(false);
    setSending(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          recipients: parsed.valid,
          senderId: senderId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send messages.");
      } else {
        setResult(data);
        const sentOk = (data.results as SendResult[]).filter((r) => r.status === "Success").length;
        const total = data.results.length;
        setToast({
          tone: sentOk === total ? "success" : "error",
          message:
            sentOk === total
              ? `Message sent to ${sentOk} recipient${sentOk === 1 ? "" : "s"}.`
              : `Sent to ${sentOk} of ${total} recipient${total === 1 ? "" : "s"} — ${
                  total - sentOk
                } failed.`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error while sending.");
    } finally {
      setSending(false);
    }
  }

  const succeeded = result?.results.filter((r) => r.status === "Success").length ?? 0;
  const failed = (result?.results.length ?? 0) - succeeded;

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 flex animate-fade-in-up items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Bulk SMS Sender
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Paste or upload your recipient numbers, write a message, and send to everyone at once
            via Africa&apos;s Talking.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recipients panel */}
        <section
          className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "60ms" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700">Recipients</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {recipientsText && (
                <button
                  type="button"
                  onClick={() => setRecipientsText("")}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear recipients"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload CSV / TXT
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <textarea
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            placeholder={"+254701922375\n+254727230675\nor paste comma-separated numbers"}
            rows={12}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />

          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            One number per line (or comma-separated). Numbers like{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">0712345678</code>{" "}
            are auto-expanded using the default country code; you can also paste full{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">+2547...</code>{" "}
            numbers directly.
          </p>

          <div className="mt-3 flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {parsed.valid.length} valid
            </span>
            {parsed.invalid.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {parsed.invalid.length} invalid
              </span>
            )}
          </div>
        </section>

        {/* Message panel */}
        <section
          className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700">Message</h2>
            </div>
            {message && (
              <button
                type="button"
                onClick={() => setMessage("")}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type the message you want to send to everyone..."
            rows={8}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />

          <div className="mt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  segmentUsagePct > 85 ? "bg-amber-500" : "bg-indigo-500"
                }`}
                style={{ width: `${segmentUsagePct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {message.length} characters · {segmentInfo.encoding} · ~
              {segmentInfo.segments || 0} SMS segment{segmentInfo.segments === 1 ? "" : "s"} per
              recipient
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Tag className="h-3.5 w-3.5" />
              Sender ID (optional)
            </label>
            <input
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              placeholder="Leave blank to use the default configured sender"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="button"
            onClick={requestSend}
            disabled={sending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {parsed.valid.length} recipient{parsed.valid.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </section>
      </div>

      {error && (
        <div className="mt-6 flex animate-fade-in-up items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <section className="mt-6 animate-fade-in-up">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Succeeded"
              value={succeeded}
              tone="emerald"
            />
            <StatCard
              icon={<XCircle className="h-4 w-4" />}
              label="Failed"
              value={failed}
              tone="red"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Skipped (invalid)"
              value={result.invalid.length}
              tone="amber"
            />
          </div>

          {result.errors.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {result.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="thin-scrollbar max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Number</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Cost</th>
                    <th className="px-4 py-2.5 font-medium">Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => {
                    const ok = r.status === "Success";
                    return (
                      <tr key={i} className="border-t border-slate-100 transition hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-700">{r.number}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={
                              ok
                                ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
                                : "inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700"
                            }
                          >
                            {ok ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{r.cost ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {r.messageId ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <ConfirmSendDialog
        open={confirmOpen}
        recipientCount={parsed.valid.length}
        invalidCount={parsed.invalid.length}
        segments={segmentInfo.segments || 1}
        onConfirm={performSend}
        onCancel={() => setConfirmOpen(false)}
      />

      {toast && (
        <Toast
          key={toast.message}
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "red" | "amber";
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold leading-tight text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
