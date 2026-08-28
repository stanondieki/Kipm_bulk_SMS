// Shared by the client UI (live preview) and the API route (authoritative check),
// so number handling never drifts between the two.

const DEFAULT_COUNTRY_CODE = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "254";

export interface NormalizeResult {
  valid: string[];
  invalid: string[];
}

/** Splits pasted text into individual candidate entries. */
export function splitRecipientInput(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Pulls out anything that looks like a phone number from arbitrary uploaded
 * text (e.g. a CSV export with name/email/phone columns and a header row).
 */
export function extractNumbersFromText(text: string): string[] {
  const matches = text.match(/\+?\d[\d \-().]{6,}\d/g) ?? [];
  return matches.map((m) => m.trim());
}

/**
 * Normalizes a list of raw phone strings to E.164-ish form (+<countrycode><number>),
 * de-duplicates them, and separates out anything that couldn't be parsed.
 */
export function normalizeAndDedupeNumbers(raw: string[]): NormalizeResult {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const entry of raw) {
    const cleaned = entry.replace(/[\s\-().]/g, "");
    if (!cleaned) continue;

    let normalized: string | null = null;

    if (/^\+\d{8,15}$/.test(cleaned)) {
      normalized = cleaned;
    } else if (/^0\d{8,10}$/.test(cleaned)) {
      normalized = `+${DEFAULT_COUNTRY_CODE}${cleaned.slice(1)}`;
    } else if (/^\d{9,15}$/.test(cleaned)) {
      normalized = `+${cleaned}`;
    }

    if (!normalized) {
      invalid.push(entry);
      continue;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      valid.push(normalized);
    }
  }

  return { valid, invalid };
}

const GSM_BASIC_RANGE = /^[\x00-\x7F£¥èéùìòÇØøÅåÆæßÉ¡ÄÖÑÜ§¿äöñüà€]*$/;

export interface SegmentInfo {
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  /** Character limit of the segment currently being typed into. */
  segmentCharLimit: number;
  /** Characters used within the segment currently being typed into. */
  charsInCurrentSegment: number;
}

/** Rough estimate of SMS segment count — actual count is decided by the carrier. */
export function estimateSegments(message: string): SegmentInfo {
  const isGsm = GSM_BASIC_RANGE.test(message);
  const singleLimit = isGsm ? 160 : 70;
  const multiLimit = isGsm ? 153 : 67;
  const len = message.length;

  if (len === 0) {
    return { encoding: isGsm ? "GSM-7" : "UCS-2", segments: 0, segmentCharLimit: singleLimit, charsInCurrentSegment: 0 };
  }

  if (len <= singleLimit) {
    return {
      encoding: isGsm ? "GSM-7" : "UCS-2",
      segments: 1,
      segmentCharLimit: singleLimit,
      charsInCurrentSegment: len,
    };
  }

  const segments = Math.ceil(len / multiLimit);
  return {
    encoding: isGsm ? "GSM-7" : "UCS-2",
    segments,
    segmentCharLimit: multiLimit,
    charsInCurrentSegment: len - (segments - 1) * multiLimit,
  };
}
