export type NavItem =
  | {
      label: string;
      path: string;
      items?: never;
    }
  | {
      label: string;
      items: NavItem[];
      path?: never;
    };

export const navItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'About',
    path: '/about',
  },
  {
    label: 'Remote',
    path: '/remote',
  },
  {
    label: 'Products',
    items: [
      {
        label: 'Pricing',
        path: '/pricing',
      },
      {
        label: 'Solutions',
        items: [
          {
            label: 'Enterprise',
            path: '/solutions/enterprise',
          },
          {
            label: 'Startup',
            path: '/solutions/startup',
          },
        ],
      },
    ],
  },
];
