import { test, expect } from '@playwright/test';

/**
 * Smoke test for the host ↔ remote federation contract.
 *
 * Asserts the *integration* — every piece can pass its unit tests and still
 * fail here if federation, shared singletons, or contexts are misconfigured.
 *
 * If this test breaks but unit tests pass, the prime suspects are:
 *   - Federation singletons (react, react-dom, zustand, react-query, router)
 *   - The host self-federation pattern (see ADR 0003)
 *   - Vite/rsbuild HMR or chunking changes
 *   - CORS on /remoteEntry.js
 */

test('host renders without the remote getting in the way', async ({ page }) => {
  await page.goto('/');
  // Use the navbar as the "host loaded" signal — exists at /, doesn't depend
  // on the remote.
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('navigating to /remote mounts the federated remote', async ({ page }) => {
  await page.goto('/remote');

  // RemoteApp shows a loading state with `aria-busy="true"` until the
  // federated module resolves. After load it disappears.
  const loading = page.locator('[aria-busy="true"]');
  await loading.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {
    // Loading may already be over; fine.
  });
  await expect(loading).toHaveCount(0, { timeout: 15_000 });

  // The remote renders *something* — at least one heading should be visible.
  // This is intentionally weak; tighten to a specific selector once your
  // remote's home route is stable.
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('theme toggle in host propagates the data-theme attribute', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const initialTheme = await html.getAttribute('data-theme');
  expect(initialTheme).toMatch(/^(light|dark)$/);

  // Toggle via the ThemeToggle button if present in the navbar.
  const toggle = page.getByRole('switch', { name: /theme/i });
  if (await toggle.count()) {
    await toggle.first().click();
    await expect(html).not.toHaveAttribute('data-theme', initialTheme ?? '');
  }
});

test('remote load failure surfaces an error boundary instead of a blank page', async ({
  page,
  context,
}) => {
  // Block the remote entry to simulate a failed federation load. The
  // RemoteApp component should retry with backoff, then surface its error
  // fallback. The rest of the host UI must keep working.
  await context.route('**/remoteEntry.js', (route) => route.abort());

  await page.goto('/remote');

  // The error fallback uses role="alert" — see RemoteApp.tsx
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });

  // Host navigation still works.
  await expect(page.getByRole('navigation')).toBeVisible();
});
