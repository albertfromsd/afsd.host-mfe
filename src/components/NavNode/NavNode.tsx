import { useState } from 'react';
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
      <li className={s.navNodeContainer}>
        <a href={item.path} className={s.navLink}>
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li
      className="nav-group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="nav-link"
        onClick={() => setOpen(v => !v)}
      >
        {item.label}
      </button>

      {open && (
        <ul className="nav-submenu">
          {item.items.map(child => (
            <NavNode
              key={`${child.label}-${depth}`}
              item={child}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}