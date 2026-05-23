import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavNode from '@/components/NavNode/NavNode';
import type { NavItem } from '@/router/nav-links';
import { useStore } from 'hostTemplate/stores/store';
import s from './Navbar.module.scss';

type Props = {
  items: NavItem[];
  brand?: string;
};

export default function Navbar({ items, brand = 'AFSD' }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const cartCount = useStore((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));

  useEffect(() => {
    // Close mobile drawer when the URL changes — drawer has independent
    // local state (the hamburger toggle) so we can't derive this; deriving
    // from `location.pathname` directly would let users get stuck "open"
    // mid-navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className={s.navbar} aria-label="Primary">
      <div className={s.brand}>{brand}</div>

      <button
        type="button"
        className={s.hamburger}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        aria-controls="primary-nav-list"
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className={mobileOpen ? `${s.bar} ${s.barOpen1}` : s.bar} />
        <span className={mobileOpen ? `${s.bar} ${s.barOpen2}` : s.bar} />
        <span className={mobileOpen ? `${s.bar} ${s.barOpen3}` : s.bar} />
      </button>

      <ul
        id="primary-nav-list"
        className={mobileOpen ? `${s.navRoot} ${s.navRootOpen}` : s.navRoot}
      >
        {items.map((item) => (
          <NavNode key={item.label} item={item} />
        ))}
        <li className={s.cartIndicatorWrap}>
          <Link to="/cart" className={s.cartIndicator} aria-label={`Cart (${cartCount} items)`}>
            Cart <span className={s.cartBadge}>{cartCount}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
