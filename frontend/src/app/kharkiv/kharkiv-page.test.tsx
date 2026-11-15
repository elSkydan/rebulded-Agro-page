import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));

import KharkivPage from './page';

afterEach(() => {
  cleanup();
});

describe('/kharkiv service cards', () => {
  it('show Ukrainian service names, not the Russian search forms', () => {
    render(<KharkivPage />);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '');

    expect(names).toContain('Оранка городу в Харкові');
    expect(names).toContain('Обробка цілини в Харкові');
    expect(names).toContain('Покіс трави в Харкові');
    expect(names.join(' ')).not.toMatch(/вспашк|целин|покос/i);
  });
});
