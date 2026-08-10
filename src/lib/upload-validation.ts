import { z } from "zod";

/**
 * Validation for the base64 data URLs the app stores inline on documents
 * (uploaded records, supplier bill photos, consent signatures).
 *
 * The client-side file picker restricts type and size, but a server action is
 * a public endpoint — anyone authenticated can POST to it directly. Without a
 * server-side check a caller could store an arbitrary blob of any type, which
 * is both a storage-abuse vector and a way to smuggle active content into a
 * field that later gets rendered in an anchor or img.
 */

/** Allowed upload types. Scans and reports are images or PDFs; nothing else. */
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i;

/** 5 MB of raw file ≈ 6.9 MB of base64 — cap the encoded length. */
export const MAX_UPLOAD_BASE64_CHARS = 7_000_000;
/** A signature is a small canvas PNG; it never needs megabytes. */
export const MAX_SIGNATURE_BASE64_CHARS = 500_000;

export interface DataUrlCheck {
  ok: boolean;
  message?: string;
}

export function checkDataUrl(
  value: string,
  { maxChars = MAX_UPLOAD_BASE64_CHARS, imagesOnly = false } = {},
): DataUrlCheck {
  if (value.length > maxChars) {
    return { ok: false, message: "That file is too large." };
  }
  const match = DATA_URL_RE.exec(value);
  if (!match) {
    return { ok: false, message: "That file could not be read." };
  }
  const mime = match[1].toLowerCase();
  const allowed = imagesOnly ? ALLOWED_MIME.filter((m) => m.startsWith("image/")) : ALLOWED_MIME;
  if (!allowed.includes(mime)) {
    return { ok: false, message: "Only images and PDF files are accepted." };
  }
  return { ok: true };
}

/** Zod field for an optional uploaded file stored as a data URL. */
export const uploadDataUrlSchema = z
  .string()
  .max(MAX_UPLOAD_BASE64_CHARS, "That file is too large")
  .refine((v) => v === "" || checkDataUrl(v).ok, "Only images and PDF files are accepted")
  .optional();

/** Zod field for a signature pad capture (small PNG). */
export const signatureDataUrlSchema = z
  .string()
  .max(MAX_SIGNATURE_BASE64_CHARS, "Signature is too large")
  .refine(
    (v) => checkDataUrl(v, { maxChars: MAX_SIGNATURE_BASE64_CHARS, imagesOnly: true }).ok,
    "Invalid signature",
  );
