/**
 * Normalizes a phone number to a consistent +<countrycode><digits> format
 * so attendee phone numbers can be exact-matched against a member's stored
 * phone for workspace meeting visibility. Assumes India (+91) when no
 * country code is given.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) {
    return `+${digits}`;
  }

  const withoutLeadingZero = digits.replace(/^0+/, "");
  return `+91${withoutLeadingZero}`;
}
