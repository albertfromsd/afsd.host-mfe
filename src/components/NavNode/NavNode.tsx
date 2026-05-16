import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { NavItem } from '@/router/nav-links';
import { isSubmenu } from './utils/navNode.utils';
import s from './NavNode.module.scss';

type Props = {
  item: NavItem;
  depth?: number;
};

export default function NavNode({ item, depth = 0 }: Props) {
  const [open, setOpen] = useState(false);

  if (!isSubmenu(item)) {
    return (
      <li className={s.navItem}>
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            isActive ? `${s.navLink} ${s.navLinkActive}` : s.navLink
          }
        >
          {item.label}
        </NavLink>
      </li>
    );
  }

  return (
    <li
      className={s.navGroup}
      data-depth={depth}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={s.navLink}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {item.label}
        <span className={s.caret} aria-hidden>▾</span>
      </button>

      {open && (
        <ul className={s.submenu}>
          {item.items.map(child => (
            <NavNode
              key={`${child.label}-${depth + 1}`}
              item={child}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
