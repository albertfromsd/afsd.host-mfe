import { useStore } from 'hostTemplate/stores/store';
import { nextTheme, THEMES } from '@/shared/styles/theme.config';
import s from './ThemeToggle.module.scss';

export default function ThemeToggle() {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  const isDark = theme === 'dark';
  const target = nextTheme(theme);

  return (
    <button
      type="button"
      className={s.toggle}
      onClick={() => setTheme(target)}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${THEMES[target].label.toLowerCase()} theme`}
      title={`Switch to ${THEMES[target].label} theme`}
    >
      <span aria-hidden className={isDark ? s.iconDark : s.iconLight}>
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}

const SunIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
