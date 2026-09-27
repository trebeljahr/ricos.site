import {
  FaBug,
  FaCheck,
  FaChevronRight,
  FaClipboardList,
  FaCode,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLightbulb,
  FaQuestion,
  FaQuoteLeft,
  FaSkullCrossbones,
  FaTimesCircle,
} from "@components/Icons";
import clsx from "clsx";
import { type FC, type ReactNode, type Ref, useEffect, useRef } from "react";

type Callout = {
  /** The canonical name, which `data-callout` carries to the stylesheet. */
  name: string;
  label: string;
  icon: ReactNode | null;
};

/*
 * Colors are not here: one `--callout-accent` per name lives in globals.css,
 * and the fill, rail, title ink, hover tint, focus ring and link color are all
 * mixed from it.
 */
const canonicalCallouts = {
  abstract: {
    label: "Abstract",
    aliases: ["summary", "tldr"],
    icon: <FaClipboardList />,
  },
  tip: {
    label: "Tip",
    aliases: ["hint", "important"],
    icon: <FaLightbulb className="size-5 shrink-0" />,
  },
  success: {
    label: "Success",
    aliases: ["check", "done"],
    icon: <FaCheck className="size-5 shrink-0" />,
  },
  question: {
    label: "Question",
    aliases: ["help", "faq"],
    icon: <FaQuestion className="size-5 shrink-0" />,
  },
  // A margin note rather than a panel, so it carries no icon at all.
  aside: {
    label: "Aside",
    aliases: [],
    icon: null,
  },
  warning: {
    label: "Warning",
    aliases: ["caution", "attention"],
    icon: <FaExclamationTriangle className="size-5 shrink-0" />,
  },
  failure: {
    label: "Failure",
    aliases: ["fail", "missing"],
    icon: <FaTimesCircle className="size-5 shrink-0" />,
  },
  danger: {
    label: "Danger",
    aliases: ["error"],
    icon: <FaSkullCrossbones className="size-5 shrink-0" />,
  },
  bug: {
    label: "Bug",
    aliases: [],
    icon: <FaBug className="size-5 shrink-0" />,
  },
  quote: {
    label: "Quote",
    aliases: [],
    icon: <FaQuoteLeft className="size-5 shrink-0" />,
  },
  info: {
    label: "Info",
    aliases: [],
    icon: <FaInfoCircle className="size-5 shrink-0" />,
  },
  todo: {
    label: "To Do",
    aliases: [],
    icon: <FaClipboardList className="size-5 shrink-0" />,
  },
  example: {
    label: "Example",
    aliases: [],
    icon: <FaCode className="size-5 shrink-0" />,
  },
};

export const callouts = Object.entries(canonicalCallouts).reduce(
  (acc, [name, { aliases, ...config }]) => {
    acc[name] = { ...config, name };
    for (const alias of aliases) {
      acc[alias] = { ...config, name };
    }
    return acc;
  },
  {} as Record<string, Callout>,
);

const getCallout = (type: keyof typeof callouts) => callouts[type] ?? callouts.info;

const FOLD_STORAGE_PREFIX = "callout-fold:";

/** `What is Shadertoy?` becomes `what-is-shadertoy`. */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Names a callout after its own title so it can be linked to, opens it when the
 * page is loaded on that link, and remembers whether this reader left it open.
 *
 * The id is assigned after hydration rather than rendered, so it cannot drift
 * from the title and cannot collide with a heading anchor. That also means the
 * browser has already given up on the hash by the time the id exists, which is
 * why the deep link is scrolled to here.
 */
function useCalloutAnchor() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const slug = slugify(el.querySelector(".callout-title")?.textContent ?? "");
    if (!slug) return;

    let id = `callout-${slug}`;
    for (let n = 2; ; n++) {
      const clash = document.getElementById(id);
      // `clash === el` is the effect running twice in development.
      if (!clash || clash === el) break;
      id = `callout-${slug}-${n}`;
    }
    el.id = id;

    const details = el instanceof HTMLDetailsElement ? el : null;
    const key = `${FOLD_STORAGE_PREFIX}${id}`;
    const isTarget = () => decodeURIComponent(window.location.hash.slice(1)) === id;

    let scrollFrame = 0;
    const openOnTarget = () => {
      if (!isTarget()) return;
      if (details) details.open = true;
      // Two frames: the box has to finish unfolding, and Next restores the
      // scroll position of its own accord on the first one.
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = requestAnimationFrame(() => el.scrollIntoView());
      });
    };

    if (isTarget()) {
      openOnTarget();
    } else if (details) {
      try {
        const saved = window.localStorage.getItem(key);
        if (saved !== null) details.open = saved === "1";
      } catch {
        // Storage blocked: the callout keeps the state the author wrote.
      }
    }

    const remember = () => {
      if (!details) return;
      try {
        window.localStorage.setItem(key, details.open ? "1" : "0");
      } catch {
        // Storage blocked: nothing to remember, the fold still works.
      }
    };

    details?.addEventListener("toggle", remember);
    window.addEventListener("hashchange", openOnTarget);
    return () => {
      cancelAnimationFrame(scrollFrame);
      details?.removeEventListener("toggle", remember);
      window.removeEventListener("hashchange", openOnTarget);
    };
  }, []);

  return ref;
}

export type CalloutProps = {
  type: keyof typeof callouts;
  isFoldable: boolean;
  defaultFolded?: boolean;
  title?: ReactNode;
  className?: string;
  children: ReactNode;
};

export const Callout: FC<CalloutProps> = ({ type, isFoldable, defaultFolded, title, children }) => {
  const isFoldableString = isFoldable.toString() as "true" | "false";
  const defaultFoldedString = defaultFolded?.toString() as "true" | "false" | undefined;

  return (
    <CalloutRoot type={type} isFoldable={isFoldableString} defaultFolded={defaultFoldedString}>
      <CalloutTitle type={type} isFoldable={isFoldableString}>
        {title}
      </CalloutTitle>
      <CalloutBody>{children}</CalloutBody>
    </CalloutRoot>
  );
};

type DetailsProps = {
  isFoldable: boolean;
  defaultFolded?: boolean;
  children: ReactNode;
  className?: string;
  "data-callout"?: string;
  ref?: Ref<HTMLElement>;
};

const Details: FC<DetailsProps> = ({ isFoldable, defaultFolded, children, ref, ...props }) => {
  return isFoldable ? (
    <details ref={ref as Ref<HTMLDetailsElement>} open={!defaultFolded} {...props}>
      {children}
    </details>
  ) : (
    <div ref={ref as Ref<HTMLDivElement>} {...props}>
      {children}
    </div>
  );
};

type SummaryProps = {
  isFoldable: boolean;
  children: ReactNode;
};

const Summary: FC<SummaryProps> = ({ isFoldable, children }) => {
  // The padding sits on the title and the body, not on the root: the title is
  // sticky once the box is open, and it can only paint edge to edge if the
  // root has no padding of its own.
  const className = "callout-title flex flex-row items-center gap-tight p-tight";

  return isFoldable ? (
    <summary className={className}>{children}</summary>
  ) : (
    <div className={className}>{children}</div>
  );
};

export type CalloutRootProps = {
  type: keyof typeof callouts;
  isFoldable: "true" | "false";
  defaultFolded?: "true" | "false";
  className?: string;
  children: ReactNode;
};

export const CalloutRoot: FC<CalloutRootProps> = ({
  children,
  className,
  type,
  isFoldable: isFoldableString,
  defaultFolded: defaultFoldedString,
}) => {
  const callout = getCallout(type);
  const isFoldable = isFoldableString === "true";
  const defaultFolded = defaultFoldedString === "true";
  const ref = useCalloutAnchor();

  return (
    <Details
      ref={ref}
      isFoldable={isFoldable}
      defaultFolded={defaultFolded}
      data-callout={callout.name}
      className={clsx("callout-root my-para rounded-lg", className)}
    >
      {children}
    </Details>
  );
};

export type CalloutTitleProps = {
  type: keyof typeof callouts;
  className?: string;
  children?: ReactNode;
  isFoldable: "true" | "false";
};

export const CalloutTitle: FC<CalloutTitleProps> = ({
  type,
  isFoldable: isFoldableString,
  children,
}) => {
  const callout = getCallout(type);
  const isFoldable = isFoldableString === "true";

  return (
    <Summary isFoldable={isFoldable}>
      {callout.icon && (
        <span className="callout-icon inline-flex origin-bottom">{callout.icon}</span>
      )}
      <span>{children ?? callout.label}</span>
      {isFoldable && <FaChevronRight className="callout-chevron size-3 shrink-0" />}
    </Summary>
  );
};

export type CalloutBodyProps = {
  className?: string;
  children: ReactNode;
};

export const CalloutBody: FC<CalloutBodyProps> = ({ children }) => {
  return <div className="callout-body px-tight pb-tight prose-p:my-tight">{children}</div>;
};
