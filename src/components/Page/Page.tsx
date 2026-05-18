import type { ReactNode } from 'react';
import s from './Page.module.scss';

type PageProps = {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Render without the standard header — useful for full-bleed Home / hero pages. */
  bare?: boolean;
  children?: ReactNode;
};

export default function Page({
  eyebrow,
  title,
  description,
  actions,
  bare = false,
  children,
}: PageProps) {
  return (
    <section className={s.page}>
      {!bare && (title || description || eyebrow || actions) && (
        <header className={s.header}>
          {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
          {title && <h1 className={s.title}>{title}</h1>}
          {description && <p className={s.description}>{description}</p>}
          {actions && <div className={s.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
