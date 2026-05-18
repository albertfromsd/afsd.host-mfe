/**
 * Theme registry — TypeScript side of the design system.
 *
 * The actual CSS variables live in `_tokens.scss`. This file declares which
 * themes the app supports, what their human-readable labels are, and gives
 * us a single typed source of truth for code that needs to enumerate or
 * label themes (toggles, settings UIs, persisted preferences).
 *
 * To add a new theme:
 *   1. Add a `[data-theme='<id>'] { ... }` block in `_tokens.scss`
 *   2. Append an entry below
 *   3. (Optional) Widen the `Theme` union in `stores/session.ts`
 */

export type ThemeId = 'light' | 'dark';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /** Used by browser UA for form controls, scrollbars, etc. */
  colorScheme: 'light' | 'dark';
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  dark: { id: 'dark', label: 'Dark', colorScheme: 'dark' },
  light: { id: 'light', label: 'Light', colorScheme: 'light' },
};

export const DEFAULT_THEME: ThemeId = 'dark';

export const THEME_LIST: readonly ThemeMeta[] = Object.values(THEMES);

/** Toggle order for the simple light/dark switch. */
export const nextTheme = (current: ThemeId): ThemeId => (current === 'dark' ? 'light' : 'dark');
