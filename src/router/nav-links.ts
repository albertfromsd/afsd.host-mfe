export type NavLink = {
  label: string;
  path: string;
};

export const navLinks: Array<NavLink | NavLink[]> = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'About',
    path: '/about',
  },
];