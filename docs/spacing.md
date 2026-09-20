# Spacing on ricos.site

One scale, named steps, no per-component numbers. Defined once in the `@theme`
block of [`src/styles/globals.css`](../src/styles/globals.css).

## Where the numbers come from

Body copy is `prose md:prose-lg xl:prose-xl` (16 / 18 / 20px with a 1.75
line-height), so one line of text is 28-36px tall. The steps are that line box
halved and doubled on a 4px grid: 8 → 16 → 24 (about one line) → 32 → 64.

## The steps

| Token | Utility | Value | Use it for |
| --- | --- | --- | --- |
| `--spacing-hair` | `mt-hair`, `gap-hair`, … | 4px | inside one line: an icon and its label |
| `--spacing-tight` | `gap-tight`, … | 8px | items in a row: chips, tags, inline meta |
| `--spacing-label` | `mt-label`, … | 12px | a label and the thing it labels |
| `--spacing-stack` | `mt-stack`, … | 16px | consecutive lines of one text block |
| `--spacing-para` | `mb-para`, … | 24px | blocks inside a section, the paragraph rhythm |
| `--spacing-group` | `mb-group`, … | 32px | a heading and the group of blocks under it |
| `--spacing-sub` | `mt-sub`, … | 40px | a subsection break |
| `--spacing-section` | `mt-section`, … | 64px | sections of a page |
| `--spacing-region` | `pb-region`, … | 80px | page regions: article to footer, page bottom |

A step name must not collide with the tail of a Tailwind class. Every
`--spacing-*` token also creates a logical-size utility (`inline-<name>`,
`block-<name>`), so a step called `block` rewrote `.inline-block` into
`inline-size: 1.5rem` and collapsed every inline-block element on the site.
Avoid `block`, `flex`, `grid`, `table`, `full`, `auto`, `screen`, `fit`,
`min`, `max` and `px` as step names.

Two more are only for the page shell:

| Token | Value | Use it for |
| --- | --- | --- |
| `--spacing-page-top` | 20px | navbar to breadcrumbs. The navbar is sticky, so this is the whole top offset a page needs |
| `--spacing-gutter` | 12px | the side gutter at every viewport |

The numeric utilities (`mt-4`, `gap-6`, …) still exist and still work. Use a
named step when the number is a spacing decision; a raw number is fine for
geometry that is not spacing, such as an icon's size.

## The page shell

Every content page goes through `PageMain` from
[`src/components/PostHeader.tsx`](../src/components/PostHeader.tsx), which
renders `<main class="mx-auto max-w-5xl px-gutter pt-page-top pb-region">`.
Do not write that shell out by hand.

The top of a page is `Header` (title, subtitle, breadcrumbs, meta row) or
`PageTop` when the title block is custom, such as a book cover or a theme hero.
The resulting rhythm, which Rico approved in September 2026, is:

```
navbar → page-top (20px) → breadcrumbs → section (64px) → [meta row]
       → label (12px) → h1 → stack (16px) → subtitle → group (32px) → body
```

## Beating the global prose margins

`<body>` carries `prose md:prose-lg xl:prose-xl`, so the typography plugin gives
every heading, paragraph and list on the site its own em margins. That is right
inside an article and wrong inside a title block, a card or a panel.

Reach for one of these instead of an `!important` margin. An `!important`
spacing utility means the system is being fought; there are none left in the
codebase, and a new one is a bug.

- **`.flow-tight` / `.flow-label` / `.flow-stack` / `.flow-para`** — zero the
  prose margins on the children and put that step between them. `.page-top`
  (the flow under the breadcrumbs) and `.post-header` (title, subtitle, byline)
  are named aliases so page code says what the block is.
- **`.flush-top` / `.flush-bottom`** — one element sits flush against its
  container, e.g. the first heading inside a card.
- **`not-prose`** — for something that is not prose at all: a link index, a
  card, a photo grid. It drops the plugin's list and paragraph margins, after
  which plain utilities hold.

These live outside every `@layer`, because the typography plugin sits in the
`utilities` layer and would otherwise win against a `@layer components` rule.
The flip side is that a plain `mt-*` utility cannot override them, which is the
point: a `.flow-*` block's rhythm is the block's, not the call site's.

## The article column

Inside prose, the rhythm stays the typography plugin's own em-based ladder, so
it scales with the type at each breakpoint instead of freezing desktop numbers
onto a phone. At `xl:prose-xl` (20px body) it comes out as:

| | gap |
| --- | --- |
| paragraph to paragraph | 24px |
| above an `h2` / below it | 56 / 32px |
| above an `h3` / below it | 48 / 20px |
| list, blockquote, figure | 24-32px |
| list item to list item | 12px |

Do not add margin utilities to prose elements to tune this. If a block needs
different spacing it is not prose: wrap it in `not-prose` or a `.flow-*` block.

## Components own their inside, not their outside

A component sets padding and the gaps between its own parts. It does not carry
an outer margin, because the page cannot then place it without fighting the
component. `NewsletterForm` used to carry `mt-16` and pages canceled it with
`[&>div]:mt-0!` and `mt-[-80px]`; the gap now sits on the page footer.

## Deliberate exceptions

One place is off the scale on purpose, and says so in a comment:
`InfiniteScrollGallery` matches react-photo-album's own row gutter (5/10/15px)
so the gap between two photo groups looks like the gaps inside one. Add a
comment like that if you ever need another.
