import type { NavItem } from "@/router/nav-links";

export function isSubmenu(item: NavItem): item is Extract<NavItem, { items: NavItem[] }> {
    return 'items' in item;
  }