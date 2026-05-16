import s from './Spinner.module.scss';

type SpinnerProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function Spinner({ label, size = 'md' }: SpinnerProps) {
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <div className={`${s.spinner} ${s[size]}`} aria-hidden="true" />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
}
