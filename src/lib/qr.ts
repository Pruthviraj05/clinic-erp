import "server-only";
import QRCode from "qrcode";

/**
 * Generate a QR code as a PNG data URL (server-side).
 * Used for prescription verification links and patient ID cards. The encoded
 * value in production is a signed verification URL; here we encode a stable
 * token/identifier.
 */
export async function generateQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
