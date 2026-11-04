// Lights up saved marks and search terms in rendered diary text through the CSS
// Custom Highlight API, which leaves the DOM alone, so a React re-render cannot
// lose or duplicate them.

export const MARK_NAME = "diary-mark";
export const TERM_NAME = "diary-term";

const live: Record<string, Map<object, Range[]>> = {
  [MARK_NAME]: new Map(),
  [TERM_NAME]: new Map(),
};

export function publish(name: string, owner: object, ranges: Range[] | null) {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  if (ranges) live[name].set(owner, ranges);
  else live[name].delete(owner);
  CSS.highlights.set(name, new Highlight(...[...live[name].values()].flat()));
}

export function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

export function rangeAt(nodes: Text[], start: number, end: number): Range | null {
  const range = document.createRange();
  let seen = 0;
  let started = false;
  for (const node of nodes) {
    const next = seen + node.length;
    if (!started && start < next) {
      range.setStart(node, start - seen);
      started = true;
    }
    if (started && end <= next) {
      range.setEnd(node, end - seen);
      return range;
    }
    seen = next;
  }
  return null;
}
