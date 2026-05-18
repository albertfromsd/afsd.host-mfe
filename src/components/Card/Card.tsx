import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import s from './Card.module.scss';

type SharedProps = {
  /** Padding scale; defaults to `md`. */
  padding?: 'sm' | 'md' | 'lg';
  /** Adds a hover lift + accent border. Auto-on when `to` is set. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

type CardAsDiv = SharedProps & { to?: never };
type CardAsLink = SharedProps & Omit<LinkProps, 'className' | 'to'> & { to: LinkProps['to'] };

export type CardProps = CardAsDiv | CardAsLink;

const cardClass = (padding: SharedProps['padding'], interactive: boolean, extra?: string) =>
  [s.card, s[`pad_${padding ?? 'md'}`], interactive ? s.interactive : '', extra]
    .filter(Boolean)
    .join(' ');

export default function Card(props: CardProps) {
  const { padding, interactive: interactiveProp, className, children, ...rest } = props;

  if ('to' in rest && rest.to !== undefined) {
    const classes = cardClass(padding, interactiveProp ?? true, className);
    return (
      <Link {...rest} to={rest.to} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={cardClass(padding, !!interactiveProp, className)}>{children}</div>;
}
