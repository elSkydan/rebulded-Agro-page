import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createLead = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createLead: (...args: unknown[]) => createLead(...args),
    fetchPublicCities: () => Promise.resolve([{ id: 1, name: 'Харків' }]),
  };
});

import { PricingSection } from './PricingSection';
import { TALL_GRASS_NOTE } from '@/lib/leadComment';

beforeEach(() => {
  localStorage.clear();
  createLead.mockReset();
  createLead.mockResolvedValue({ id: 1 });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

async function fillPhoneAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Номер телефону/), '0671234567');
  await user.click(screen.getByRole('button', { name: 'Надіслати заявку' }));
  await waitFor(() => expect(createLead).toHaveBeenCalledTimes(1));
  return createLead.mock.calls[0][0] as { comment?: string };
}

describe('PricingSection — tall grass checkbox', () => {
  it('sends the tall-grass note with the lead when the box is ticked', async () => {
    const user = userEvent.setup();
    render(<PricingSection />);

    await user.click(screen.getByLabelText('Ділянка заросла високою травою'));
    await user.type(screen.getByLabelText(/Коментар/), 'Після 18:00');

    const payload = await fillPhoneAndSubmit(user);
    expect(payload.comment).toBe(`${TALL_GRASS_NOTE} Після 18:00`);
  });

  it('sends no note when the box is not ticked', async () => {
    const user = userEvent.setup();
    render(<PricingSection />);

    const payload = await fillPhoneAndSubmit(user);
    expect(payload.comment).toBeUndefined();
  });

  it('shows the tall-grass flag in the attached estimate', async () => {
    const user = userEvent.setup();
    render(<PricingSection />);

    await user.click(screen.getByLabelText('Ділянка заросла високою травою'));
    expect(screen.getByText(/висока трава/)).toBeTruthy();
  });
});
