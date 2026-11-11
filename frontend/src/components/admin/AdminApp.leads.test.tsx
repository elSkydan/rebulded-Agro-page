import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminApp } from './AdminApp';
import { TOKEN_STORAGE_KEY } from '@/lib/admin/token-store';
import { TOKEN, fakeBackend, makeLead } from './fakeBackend';

function leadRow(id: number) {
  return screen.getByRole('listitem', { name: `Заявка #${id}` });
}

function tile(label: string) {
  return screen.getByRole('group', { name: label });
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminApp — leads', () => {
  it('opens on the leads tab with the summary', async () => {
    fakeBackend({ leads: [makeLead()] });
    render(<AdminApp />);

    const tab = await screen.findByRole('tab', { name: 'Заявки' });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByRole('heading', { name: 'Заявки (1)' })).toBeTruthy();

    expect(within(tile('Сьогодні')).getByText('4')).toBeTruthy();
    expect(within(tile('Очікують')).getByText('2')).toBeTruthy();
    expect(within(tile('Без виконавця')).getByText('1')).toBeTruthy();
    expect(within(tile('Активні виконавці')).getByText('3')).toBeTruthy();
  });

  it('shows the lead details with a callable phone', async () => {
    fakeBackend({
      leads: [makeLead({ comment: 'Ворота зліва', out_of_city: true, worker_name: 'Іван', status: 'assigned' })],
    });
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (1)' });
    const row = leadRow(41);

    expect(within(row).getByText('Олена')).toBeTruthy();
    expect(within(row).getByRole('link', { name: '+380671112233' }).getAttribute('href')).toBe('tel:+380671112233');
    expect(within(row).getByText(/Огород \/ вспашка/)).toBeTruthy();
    expect(within(row).getByText(/6 сот\./)).toBeTruthy();
    expect(within(row).getByText(/1\s800 грн/)).toBeTruthy();
    expect(within(row).getByText(/Харків/)).toBeTruthy();
    expect(within(row).getByText(/за містом/)).toBeTruthy();
    expect(within(row).getByText(/Іван/)).toBeTruthy();
    expect(within(row).getByText(/Ворота зліва/)).toBeTruthy();
    expect(within(row).getByText('Призначена')).toBeTruthy();
    // 12:05 UTC is 14:05 in Kyiv (EET, November).
    expect(within(row).getByText(/11\.11 14:05/)).toBeTruthy();
  });

  it('shows an empty state', async () => {
    fakeBackend();
    render(<AdminApp />);
    expect(await screen.findByText('Заявок немає')).toBeTruthy();
  });

  it('filters by status through the API', async () => {
    const backend = fakeBackend({
      leads: [makeLead(), makeLead({ id: 42, status: 'unassigned' })],
    });
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (2)' });

    await user.selectOptions(screen.getByLabelText('Статус'), 'Без виконавця');

    expect(await screen.findByRole('heading', { name: 'Заявки (1)' })).toBeTruthy();
    expect(leadRow(42)).toBeTruthy();
    expect(screen.queryByRole('listitem', { name: 'Заявка #41' })).toBeNull();
    expect(backend.gets('/api/leads?').at(-1)?.url).toBe('/api/leads?status=unassigned&limit=50&offset=0');
  });

  it('cancels a lead after confirmation and refreshes the summary', async () => {
    const backend = fakeBackend({ leads: [makeLead()] });
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (1)' });
    const statsCallsBefore = backend.gets('/api/leads/debug/stats').length;

    await user.click(within(leadRow(41)).getByRole('button', { name: 'Скасувати' }));
    expect(backend.mutating()).toEqual([]);
    expect(within(leadRow(41)).getByText('Скасувати заявку #41?')).toBeTruthy();

    await user.click(within(leadRow(41)).getByRole('button', { name: 'Так' }));

    await waitFor(() => expect(within(leadRow(41)).getByText('Скасована')).toBeTruthy());
    expect(backend.mutating()).toEqual([{ method: 'PATCH', url: '/api/leads/41/cancel', body: undefined }]);
    await waitFor(() => expect(backend.gets('/api/leads/debug/stats').length).toBe(statsCallsBefore + 1));
    expect(within(leadRow(41)).queryByRole('button', { name: 'Скасувати' })).toBeNull();
  });

  it('keeps the lead when the confirmation is declined', async () => {
    const backend = fakeBackend({ leads: [makeLead()] });
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (1)' });
    await user.click(within(leadRow(41)).getByRole('button', { name: 'Скасувати' }));
    await user.click(within(leadRow(41)).getByRole('button', { name: 'Ні' }));
    expect(within(leadRow(41)).getByText('Нова')).toBeTruthy();
    expect(backend.mutating()).toEqual([]);
  });

  it('offers no cancel for leads that are already in progress or closed', async () => {
    fakeBackend({
      leads: [makeLead({ id: 1, status: 'accepted' }), makeLead({ id: 2, status: 'completed' })],
    });
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (2)' });
    expect(within(leadRow(1)).queryByRole('button', { name: 'Скасувати' })).toBeNull();
    expect(within(leadRow(2)).queryByRole('button', { name: 'Скасувати' })).toBeNull();
  });

  it('loads more pages on demand', async () => {
    const leads = Array.from({ length: 55 }, (_, i) => makeLead({ id: i + 1 }));
    fakeBackend({ leads });
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: 'Заявки (55)' });
    expect(screen.getAllByRole('listitem')).toHaveLength(50);

    await user.click(screen.getByRole('button', { name: 'Показати ще' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(55));
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull();
  });
});
