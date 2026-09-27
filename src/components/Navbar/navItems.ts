export type NavItem = {
  label: string;
  href: string;
  /** Draw a separator above this item, to split a group into sections. */
  dividerBefore?: boolean;
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
      // Separated because these two cut across the trips rather than listing
      // them: the same photos, indexed by measured colour instead of by place.
      // The two above are both ways of asking where a photo was taken; these
      // two are the only ones that ignore place entirely.
      { label: "by colour", href: "/photography/colors", dividerBefore: true },
      { label: "spectrum", href: "/photography/spectrum" },
    ],
  },
  {
    label: "making",
    items: [
      { label: "projects", href: "/projects" },
      { label: "3D playground", href: "/r3f" },
      { label: "midjourney", href: "/midjourney" },
      { label: "1-month projects", href: "/1-month-projects" },
    ],
  },
  {
    label: "notebook",
    items: [
      { label: "booknotes", href: "/booknotes" },
      { label: "quotes", href: "/quotes" },
      { label: "needlestack", href: "/needlestack" },
    ],
  },
  {
    label: "about",
    items: [
      { label: "start here", href: "/start-here" },
      { label: "now", href: "/now" },
      { label: "principles", href: "/principles" },
      { label: "achievements", href: "/achievements" },
      { label: "timeline", href: "/timeline", dividerBefore: true },
      { label: "categories", href: "/categories" },
    ],
  },
];
