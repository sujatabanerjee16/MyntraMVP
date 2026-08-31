const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
const ORDER = /\b(?:ORD|ORDER)[-_ ]?\d{4,}\b/gi;

export function redactPii(text: string): { text: string; redacted: boolean } {
  const next = text
    .replace(EMAIL, "[redacted-email]")
    .replace(PHONE, "[redacted-phone]")
    .replace(ORDER, "[redacted-order]");
  return { text: next, redacted: next !== text };
}
