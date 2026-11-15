import { describe, expect, it } from 'vitest';
import {
  MAX_LEAD_COMMENT_LENGTH,
  TALL_GRASS_NOTE,
  buildLeadComment,
  commentMaxLength,
} from './leadComment';

describe('buildLeadComment', () => {
  it('returns undefined for an empty comment without tall grass', () => {
    expect(buildLeadComment('   ', false)).toBeUndefined();
  });

  it('returns the trimmed comment without tall grass', () => {
    expect(buildLeadComment('  вул. Сумська, 10  ', false)).toBe('вул. Сумська, 10');
  });

  it('sends only the note when tall grass is ticked and the comment is empty', () => {
    expect(buildLeadComment('', true)).toBe(TALL_GRASS_NOTE);
  });

  it('puts the note before the client comment', () => {
    expect(buildLeadComment('Після 18:00', true)).toBe(`${TALL_GRASS_NOTE} Після 18:00`);
  });

  it('never exceeds the server limit', () => {
    const long = 'а'.repeat(MAX_LEAD_COMMENT_LENGTH);
    expect(buildLeadComment(long, true)!.length).toBe(MAX_LEAD_COMMENT_LENGTH);
    expect(buildLeadComment(long, false)!.length).toBe(MAX_LEAD_COMMENT_LENGTH);
  });

  it('leaves room for the note in the textarea limit', () => {
    expect(commentMaxLength(false)).toBe(MAX_LEAD_COMMENT_LENGTH);
    expect(commentMaxLength(true) + TALL_GRASS_NOTE.length + 1).toBe(MAX_LEAD_COMMENT_LENGTH);
  });
});
