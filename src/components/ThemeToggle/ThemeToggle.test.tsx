import { afterEach, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { useStore } from '@/shared/stores/store';
import { renderWithProviders, resetStore } from '@/shared/test/renderWithProviders';
import ThemeToggle from './ThemeToggle';

afterEach(resetStore);

describe('<ThemeToggle />', () => {
  it('renders the moon icon and dark-mode aria-checked when theme=dark', () => {
    renderWithProviders(<ThemeToggle />, { seedStore: { theme: 'dark' } });

    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'true');
    expect(button).toHaveAccessibleName(/light theme/i);
  });

  it('clicking the toggle flips the store theme from dark to light', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />, { seedStore: { theme: 'dark' } });

    await user.click(screen.getByRole('switch'));

    expect(useStore.getState().theme).toBe('light');
  });

  it('aria-checked reflects current theme after toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />, { seedStore: { theme: 'dark' } });

    await user.click(screen.getByRole('switch'));

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
