import { describe, expect, it } from 'vitest';
import {
  buildPriceBreakdown,
  calcClientPreview,
  parseAreaInput,
  parseServiceParam,
} from './pricing';

describe('parseAreaInput', () => {
  it('accepts decimal comma', () => {
    expect(parseAreaInput('12,5')).toBe(12.5);
  });

  it('accepts decimal dot', () => {
    expect(parseAreaInput('12.5')).toBe(12.5);
  });
});

describe('parseServiceParam', () => {
  it('maps burinnya slug to drilling', () => {
    expect(parseServiceParam('burinnya')).toBe('drilling');
  });

  it('accepts drilling type', () => {
    expect(parseServiceParam('drilling')).toBe('drilling');
  });

  it('returns null for unknown', () => {
    expect(parseServiceParam('nope')).toBeNull();
  });
});

describe('buildPriceBreakdown', () => {
  it('sums lines to total for washing in city (min order gap as Виїзд)', () => {
    const preview = calcClientPreview('washing', 1, false);
    expect(preview.ok).toBe(true);
    const breakdown = buildPriceBreakdown('washing', preview.area, false, preview)!;
    const sum = breakdown.lines.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(breakdown.total);
    expect(breakdown.total).toBe(1500);
    expect(breakdown.lines.some((l) => l.label === 'Виїзд' && l.amount === 1250)).toBe(true);
  });

  it('shows included call-out when base already covers min order', () => {
    const preview = calcClientPreview('ogorod', 10, false);
    const breakdown = buildPriceBreakdown('ogorod', preview.area!, false, preview)!;
    const sum = breakdown.lines.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(breakdown.total);
    expect(breakdown.lines.some((l) => l.label === 'Виїзд по місту включено')).toBe(true);
  });

  it('adds out-of-city line for mowing', () => {
    const preview = calcClientPreview('mowing', 10, true);
    const breakdown = buildPriceBreakdown('mowing', preview.area!, true, preview)!;
    const sum = breakdown.lines.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(2800);
    expect(breakdown.total).toBe(2800);
  });

  it('drilling base is 100 then lifts to min order', () => {
    const preview = calcClientPreview('drilling', 1, false);
    const breakdown = buildPriceBreakdown('drilling', preview.area!, false, preview)!;
    expect(breakdown.lines[0]?.amount).toBe(100);
    expect(breakdown.total).toBe(1500);
  });
});
