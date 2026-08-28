import { NextRequest, NextResponse } from "next/server";
import {
  AfricasTalkingConfigError,
  assertConfigured,
  sendBulkSms,
  type SendResult,
} from "@/lib/africastalking";
import { normalizeAndDedupeNumbers } from "@/lib/phone";

export const runtime = "nodejs";

// Keep each API call to Africa's Talking reasonably sized rather than one
// giant request for the whole list.
const BATCH_SIZE = 100;

interface SendRequestBody {
  message?: string;
  recipients?: string[];
  senderId?: string;
}

export async function POST(req: NextRequest) {
  let payload: SendRequestBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (payload.message ?? "").trim();
  const rawRecipients = payload.recipients ?? [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (!Array.isArray(rawRecipients) || rawRecipients.length === 0) {
    return NextResponse.json({ error: "At least one recipient is required." }, { status: 400 });
  }

  const { valid, invalid } = normalizeAndDedupeNumbers(rawRecipients);

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid phone numbers found.", invalid },
      { status: 400 }
    );
  }

  try {
    assertConfigured();
  } catch (err) {
    if (err instanceof AfricasTalkingConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const batches: string[][] = [];
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    batches.push(valid.slice(i, i + BATCH_SIZE));
  }

  const results: SendResult[] = [];
  const errors: string[] = [];

  for (const batch of batches) {
    try {
      const batchResults = await sendBulkSms({
        message,
        recipients: batch,
        senderId: payload.senderId,
      });
      results.push(...batchResults);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({
    totalRequested: rawRecipients.length,
    totalValid: valid.length,
    invalid,
    results,
    errors,
  });
}
