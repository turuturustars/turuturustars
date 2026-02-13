const KE_MOBILE_LOCAL = /^0([17]\d{8})$/;
const KE_MOBILE_INTL = /^254([17]\d{8})$/;

export function normalizeKenyanPhone(phone: string): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');

  const localMatch = digits.match(KE_MOBILE_LOCAL);
  if (localMatch) {
    return `+254${localMatch[1]}`;
  }

  const intlMatch = digits.match(KE_MOBILE_INTL);
  if (intlMatch) {
    return `+254${intlMatch[1]}`;
  }

  return null;
}

export function isValidKenyanPhone(phone: string): boolean {
  return normalizeKenyanPhone(phone) !== null;
}

export function formatKenyanPhoneError(): string {
  return 'Enter a valid Kenyan mobile number: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.';
}

