export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "writing",
    items: [
      { label: "essays", href: "/posts" },
      { label: "newsletters", href: "/newsletters" },
      { label: "travel stories", href: "/travel" },
    ],
  },
  {
    label: "photography",
    items: [
      { label: "galleries", href: "/photography" },
      { label: "best of", href: "/photography/best-of" },
    ],
  },
  {
    label: "projects",
    items: [
      { label: "3D playground", href: "/r3f" },
      { label: "midjourney", href: "/midjourney" },
      { label: "1-month projects", href: "/1-month-projects" },
      { label: "achievements", href: "/achievements" },
    ],
  },
  {
    label: "notebook",
    items: [
      { label: "booknotes", href: "/booknotes" },
      { label: "quotes", href: "/quotes" },
      { label: "needlestack", href: "/needlestack" },
      { label: "principles", href: "/principles" },
      { label: "categories", href: "/categories" },
      { label: "timeline", href: "/timeline" },
    ],
  },
];

export const primaryNavigation: NavItem[] = [{ label: "now", href: "/now" }];
