import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminApp } from './AdminApp';
import { TOKEN_STORAGE_KEY } from '@/lib/admin/token-store';
import { TOKEN, fakeBackend, makeWorker } from './fakeBackend';

type User = ReturnType<typeof userEvent.setup>;

async function login(user: User, token = TOKEN) {
  await user.type(screen.getByLabelText('Адмін-токен'), token);
  await user.click(screen.getByRole('button', { name: 'Увійти' }));
}

/** Render with a stored token and switch to the workers tab. */
async function renderWorkers() {
  const user = userEvent.setup();
  render(<AdminApp />);
  await user.click(await screen.findByRole('tab', { name: 'Виконавці' }));
  return user;
}

function rowOf(name: string) {
  return screen.getByRole('listitem', { name });
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminApp — auth', () => {
  it('shows the login form when there is no token', () => {
    fakeBackend();
    render(<AdminApp />);
    expect(screen.getByLabelText('Адмін-токен')).toHaveProperty('type', 'password');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('rejects a wrong token and stays on login', async () => {
    fakeBackend({ workers: [makeWorker()] });
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user, 'wrong');
    expect(await screen.findByText('Невірний токен')).toBeTruthy();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('logs in, saves the token for the session and lists workers', async () => {
    fakeBackend({
      workers: [makeWorker(), makeWorker({ id: 2, name: 'Петро', city_id: 2, city_name: 'Мерефа', is_active: false })],
    });
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);
    await user.click(await screen.findByRole('tab', { name: 'Виконавці' }));

    expect(await screen.findByRole('heading', { name: 'Виконавці (2)' })).toBeTruthy();
    expect(within(rowOf('Іван')).getByText('Харків')).toBeTruthy();
    expect(within(rowOf('Петро')).getByText('Неактивний')).toBeTruthy();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe(TOKEN);
  });

  it('uses a stored token without asking again', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    fakeBackend({ workers: [makeWorker()] });
    await renderWorkers();
    expect(await screen.findByRole('listitem', { name: 'Іван' })).toBeTruthy();
  });

  it('returns to login and clears a stale token on 401', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'stale');
    fakeBackend({ workers: [makeWorker()] });
    render(<AdminApp />);
    expect(await screen.findByText('Сесія недійсна, увійдіть знову')).toBeTruthy();
    expect(screen.getByLabelText('Адмін-токен')).toBeTruthy();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('logout clears the token', async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    fakeBackend({ workers: [makeWorker()] });
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('tablist');
    await user.click(screen.getByRole('button', { name: 'Вийти' }));
    expect(screen.getByLabelText('Адмін-токен')).toBeTruthy();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe('AdminApp — workers', () => {
  beforeEach(() => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
  });

  it('shows an empty state', async () => {
    fakeBackend();
    await renderWorkers();
    expect(await screen.findByText('Ще немає виконавців')).toBeTruthy();
  });

  it('adds a worker', async () => {
    const backend = fakeBackend();
    const user = await renderWorkers();
    await screen.findByText('Ще немає виконавців');

    await user.click(screen.getByRole('button', { name: 'Додати виконавця' }));
    const dialog = screen.getByRole('dialog', { name: 'Новий виконавець' });
    await user.type(within(dialog).getByLabelText("Ім'я"), 'Олег');
    await user.selectOptions(within(dialog).getByLabelText('Місто'), 'Мерефа');
    await user.type(within(dialog).getByLabelText('Telegram chat ID'), '555000111');
    await user.selectOptions(within(dialog).getByLabelText('Техніка'), 'Трактор');
    await user.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByRole('listitem', { name: 'Олег' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(backend.mutating()).toEqual([
      {
        method: 'POST',
        url: '/api/workers',
        body: {
          name: 'Олег',
          city_id: 2,
          telegram_chat_id: '555000111',
          phone: null,
          equipment_type: 'tractor',
          priority: 0,
          is_active: true,
        },
      },
    ]);
  });

  it('does not submit an invalid form', async () => {
    const backend = fakeBackend();
    const user = await renderWorkers();
    await screen.findByText('Ще немає виконавців');
    await user.click(screen.getByRole('button', { name: 'Додати виконавця' }));
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getAllByRole('alert').length).toBeGreaterThan(0);
    expect(backend.mutating()).toEqual([]);
  });

  it('shows a duplicate telegram id error and keeps the dialog open', async () => {
    fakeBackend({
      failWith: { status: 409, body: { error: 'Worker with this telegram_chat_id already exists', code: 'DUPLICATE' } },
    });
    const user = await renderWorkers();
    await screen.findByText('Ще немає виконавців');
    await user.click(screen.getByRole('button', { name: 'Додати виконавця' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText("Ім'я"), 'Олег');
    await user.selectOptions(within(dialog).getByLabelText('Місто'), 'Харків');
    await user.type(within(dialog).getByLabelText('Telegram chat ID'), '197656058');
    await user.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    expect(await within(dialog).findByText('Виконавець з таким Telegram ID вже існує')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('deactivates a worker', async () => {
    const backend = fakeBackend({ workers: [makeWorker()] });
    const user = await renderWorkers();
    const row = await screen.findByRole('listitem', { name: 'Іван' });
    await user.click(within(row).getByRole('button', { name: 'Деактивувати' }));

    await waitFor(() => expect(within(rowOf('Іван')).getByText('Неактивний')).toBeTruthy());
    expect(backend.mutating()).toEqual([{ method: 'PATCH', url: '/api/workers/1', body: { is_active: false } }]);
  });

  it('edits a worker sending only changed fields', async () => {
    const backend = fakeBackend({ workers: [makeWorker()] });
    const user = await renderWorkers();
    const row = await screen.findByRole('listitem', { name: 'Іван' });
    await user.click(within(row).getByRole('button', { name: 'Редагувати' }));

    const dialog = screen.getByRole('dialog', { name: 'Редагувати виконавця' });
    const priority = within(dialog).getByLabelText('Пріоритет');
    await user.clear(priority);
    await user.type(priority, '9');
    await user.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(rowOf('Іван')).getByText('9')).toBeTruthy();
    expect(backend.mutating()).toEqual([{ method: 'PATCH', url: '/api/workers/1', body: { priority: 9 } }]);
  });

  it('deletes only after a second confirmation', async () => {
    const backend = fakeBackend({ workers: [makeWorker()] });
    const user = await renderWorkers();
    const row = await screen.findByRole('listitem', { name: 'Іван' });
    await user.click(within(row).getByRole('button', { name: 'Редагувати' }));
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Видалити виконавця' }));
    expect(backend.mutating()).toEqual([]);
    expect(within(dialog).getByText(/Історія призначень буде втрачена/)).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Так, видалити' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Іван' })).toBeNull());
    expect(backend.mutating()).toEqual([{ method: 'DELETE', url: '/api/workers/1', body: undefined }]);
  });
});
