/**
 * UA phone helpers for the lead form.
 * Always normalizes toward +380XXXXXXXXX as the user types.
 */

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Formats raw digits into "+38 (0XX) XXX-XX-XX". */
export function formatPhone(raw: string): string {
  let val = digitsOnly(raw);

  if (val.startsWith('380')) {
    // already international
  } else if (val.startsWith('80')) {
    val = '3' + val;
  } else if (val.startsWith('0')) {
    val = '38' + val;
  } else if (val.startsWith('38')) {
    // partial "38…" while typing
  } else if (val.length > 0) {
    // National number without leading 0 (e.g. 50… / 67…) → prepend 380
    val = '380' + val;
  }

  if (val.length > 12) val = val.slice(0, 12);

  let formatted = '';
  if (val.length > 0) formatted = '+' + val.slice(0, 2);
  if (val.length > 2) formatted += ' (' + val.slice(2, 5);
  if (val.length > 5) formatted += ') ' + val.slice(5, 8);
  if (val.length > 8) formatted += '-' + val.slice(8, 10);
  if (val.length > 10) formatted += '-' + val.slice(10, 12);

  return formatted || raw;
}

/** True when we have a full UA mobile: 380 + 9 digits. */
export function isValidPhone(val: string): boolean {
  const d = digitsOnly(val);
  return d.length === 12 && d.startsWith('380');
}
