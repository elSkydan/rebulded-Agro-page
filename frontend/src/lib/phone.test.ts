import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone } from './phone';

describe('formatPhone', () => {
  it('keeps +380 when typing the country code', () => {
    expect(formatPhone('+38067')).toBe('+38 (067');
    expect(formatPhone('+380671112233')).toBe('+38 (067) 111-22-33');
  });

  it('prepends 38 when the user starts with a leading 0', () => {
    expect(formatPhone('0671112233')).toBe('+38 (067) 111-22-33');
  });

  it('prepends 380 when the user omits the leading 0 (QA: 50… must not become +50)', () => {
    expect(formatPhone('500000000')).toMatch(/^\+38 \(050\)/);
    expect(formatPhone('671112233')).toBe('+38 (067) 111-22-33');
  });
});

describe('isValidPhone', () => {
  it('requires a full 380 + 9 digits number', () => {
    expect(isValidPhone('+38 (067) 111-22-33')).toBe(true);
    expect(isValidPhone('+38 (067) 111')).toBe(false);
    expect(isValidPhone('+50 (000) 000-0')).toBe(false);
  });
});
