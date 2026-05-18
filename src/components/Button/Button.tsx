import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import s from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
};

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    to?: never;
    href?: never;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  };

type ButtonAsRouterLink = SharedProps &
  Omit<LinkProps, 'to'> & {
    to: LinkProps['to'];
    href?: never;
    type?: never;
  };

type ButtonAsAnchor = SharedProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    to?: never;
    type?: never;
  };

export type ButtonProps = ButtonAsButton | ButtonAsRouterLink | ButtonAsAnchor;

const classes = (props: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean }) =>
  [
    s.button,
    s[`v_${props.variant ?? 'primary'}`],
    s[`size_${props.size ?? 'md'}`],
    props.fullWidth ? s.fullWidth : '',
  ]
    .filter(Boolean)
    .join(' ');

export default function Button(props: ButtonProps) {
  const { variant, size, fullWidth, leadingIcon, trailingIcon, children, ...rest } = props;
  const className =
    `${classes({ variant, size, fullWidth })} ${'className' in rest && rest.className ? rest.className : ''}`.trim();

  const body = (
    <>
      {leadingIcon && <span className={s.icon}>{leadingIcon}</span>}
      <span className={s.label}>{children}</span>
      {trailingIcon && <span className={s.icon}>{trailingIcon}</span>}
    </>
  );

  if ('to' in rest && rest.to !== undefined) {
    return (
      <Link {...(rest as Omit<LinkProps, 'className'>)} className={className}>
        {body}
      </Link>
    );
  }

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} className={className}>
        {body}
      </a>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonRest} type={buttonRest.type ?? 'button'} className={className}>
      {body}
    </button>
  );
}
