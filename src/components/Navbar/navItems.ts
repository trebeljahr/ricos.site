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
      { label: "all writing", href: "/writing" },
      { label: "essays", href: "/posts" },
      { label: "newsletters", href: "/newsletters" },
      { label: "travel stories", href: "/travel" },
      { label: "podcast notes", href: "/podcastnotes" },
    ],
  },
  {
    label: "photography",
    items: [
      { label: "galleries", href: "/photography" },
      { label: "best of", href: "/photography/best-of" },
      { label: "photo essays", href: "/photography/essays" },
      { label: "prints", href: "/photography/prints" },
    ],
  },
  {
    label: "projects",
    items: [
      { label: "art & drawings", href: "/art" },
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
      { label: "everything", href: "/everything" },
    ],
  },
];

export const primaryNavigation: NavItem[] = [{ label: "now", href: "/now" }];
