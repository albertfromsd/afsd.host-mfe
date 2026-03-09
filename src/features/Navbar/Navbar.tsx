import NavNode from '@/components/NavNode/NavNode';
import type { NavItem } from '@/router/nav-links';
import s from './Navbar.module.scss';

type Props = {
  items: NavItem[];
};

export default function Navbar({ items }: Props) {
  return (
    <nav id={s.navbarContainer}>
      <ul className={s.navRoot}>
        {items.map(item => (
          <NavNode
            key={item.label}
            item={item}
          />
        ))}
      </ul>
    </nav>
  );
}