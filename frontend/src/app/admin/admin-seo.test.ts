import { describe, expect, it } from 'vitest';
import robots from '../robots';
import sitemap from '../sitemap';
import { metadata } from './page';

describe('/admin is hidden from search engines', () => {
  it('page metadata is noindex, nofollow', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('robots.txt disallows /admin and still disallows /api/', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallow = ([] as string[]).concat(rule.disallow ?? []);
    expect(disallow).toEqual(expect.arrayContaining(['/api/', '/admin']));
  });

  it('sitemap does not list /admin', () => {
    expect(sitemap().some((e) => e.url.includes('/admin'))).toBe(false);
  });
});
