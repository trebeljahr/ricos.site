export type NavItem = {
  label: string;
  href: string;
};

export const mainNavigation: NavItem[] = [
  { label: "writing", href: "/writing" },
  { label: "everything", href: "/everything" },
  { label: "photography", href: "/photography" },
  { label: "travel", href: "/travel" },
  { label: "lab", href: "/r3f" },
];

export const resourceNavigation: NavItem[] = [
  { label: "essays", href: "/posts" },
  { label: "newsletters", href: "/newsletters" },
  { label: "booknotes", href: "/booknotes" },
  { label: "podcastnotes", href: "/podcastnotes" },
  { label: "quotes", href: "/quotes" },
  { label: "needlestack", href: "/needlestack" },
  { label: "categories", href: "/categories" },
];

export const aboutNavigation: NavItem[] = [
  { label: "start-here", href: "/start-here" },
  { label: "now", href: "/now" },
  { label: "principles", href: "/principles" },
  { label: "1-month-projects", href: "/1-month-projects" },
  { label: "support", href: "/support" },
];
