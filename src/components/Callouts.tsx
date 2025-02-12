import clsx from "clsx";
import type { FC, ReactNode } from "react";
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
} from "react-icons/fa";

type Callout = {
  label: string;
  icon: ReactNode;
  className: {
    root: string;
    title: string;
  };
};

const canonicalCallouts = {
  abstract: {
    label: "Abstract",
    aliases: ["summary", "tldr"],
    icon: <FaClipboardList />,
    className: {
      root: "bg-purple-500/10 border-purple-600/20 dark:border-purple-800/20",
      title: "text-purple-600 dark:text-purple-400",
    },
  },
  tip: {
    label: "Tip",
    aliases: ["hint", "important"],
    icon: <FaLightbulb className="size-5 shrink-0" />,
    className: {
      root: "bg-teal-500/10 border-teal-600/20 dark:border-teal-800/20",
      title: "text-teal-600 dark:text-teal-400",
    },
  },
  success: {
    label: "Success",
    aliases: ["check", "done"],
    icon: <FaCheck className="size-5 shrink-0" />,
    className: {
      root: "bg-green-500/10 border-green-600/20 dark:border-green-800/20",
      title: "text-green-600 dark:text-green-400",
    },
  },
  question: {
    label: "Question",
    aliases: ["help", "faq"],
    icon: <FaQuestion className="size-5 shrink-0" />,
    className: {
      root: "bg-yellow-500/10 border-yellow-600/20 dark:border-yellow-800/20",
      title: "text-yellow-600 dark:text-yellow-400",
    },
  },
  warning: {
    label: "Warning",
    aliases: ["caution", "attention"],
    icon: <FaExclamationTriangle className="size-5 shrink-0" />,
    className: {
      root: "bg-orange-500/10 border-orange-600/20 dark:border-orange-800/20",
      title: "text-orange-600 dark:text-orange-400",
    },
  },
  failure: {
    label: "Failure",
    aliases: ["fail", "missing"],
    icon: <FaTimesCircle className="size-5 shrink-0" />,
    className: {
      root: "bg-red-500/10 border-red-600/20 dark:border-red-800/20",
      title: "text-red-600 dark:text-red-400",
    },
  },
  danger: {
    label: "Danger",
    aliases: ["error"],
    icon: <FaSkullCrossbones className="size-5 shrink-0" />,
    className: {
      root: "bg-pink-500/10 border-pink-600/20 dark:border-pink-800/20",
      title: "text-pink-600 dark:text-pink-400",
    },
  },
  bug: {
    label: "Bug",
    aliases: [],
    icon: <FaBug className="size-5 shrink-0" />,
    className: {
      root: "bg-orange-500/10 border-orange-600/20 dark:border-orange-800/20",
      title: "text-orange-600 dark:text-orange-400",
    },
  },
  quote: {
    label: "Quote",
    aliases: [],
    icon: <FaQuoteLeft className="size-5 shrink-0" />,
    className: {
      root: "bg-gray-500/10 border-gray-600/20 dark:border-gray-800/20",
      title: "text-gray-600 dark:text-gray-400",
    },
  },
  info: {
    label: "Info",
    aliases: [],
    icon: <FaInfoCircle className="size-5 shrink-0" />,
    className: {
      root: "bg-blue-500/10 border-blue-600/20 dark:border-blue-800/20",
      title: "text-blue-600 dark:text-blue-400",
    },
  },
  todo: {
    label: "To Do",
    aliases: [],
    icon: <FaClipboardList className="size-5 shrink-0" />,
    className: {
      root: "bg-indigo-500/10 border-indigo-600/20 dark:border-indigo-800/20",
      title: "text-indigo-600 dark:text-indigo-400",
    },
  },
  example: {
    label: "Example",
    aliases: [],
    icon: <FaCode className="size-5 shrink-0" />,
    className: {
      root: "bg-violet-500/10 border-violet-600/20 dark:border-violet-800/20",
      title: "text-violet-600 dark:text-violet-400",
    },
  },
};

export const callouts = Object.entries(canonicalCallouts).reduce(
  (acc, [key, config]) => {
    acc[key] = config;
    config.aliases.forEach((alias) => {
      acc[alias] = config;
    });
    return acc;
  },
  {} as Record<string, Callout>
);

const getCallout = (type: keyof typeof callouts) =>
  callouts[type] ?? callouts.info;

export type CalloutProps = {
  type: keyof typeof callouts;
  isFoldable: boolean;
  defaultFolded?: boolean;
  title?: ReactNode;
  className?: string;
  children: ReactNode;
};

export const Callout: FC<CalloutProps> = ({
  type,
  isFoldable,
  defaultFolded,
  title,
  children,
}) => {
  const callout = getCallout(type);
  const isFoldableString = isFoldable.toString() as "true" | "false";
  const defaultFoldedString = defaultFolded?.toString() as
    | "true"
    | "false"
    | undefined;

  return (
    <CalloutRoot
      className={callout.className.root}
      type={type}
      isFoldable={isFoldableString}
      defaultFolded={defaultFoldedString}
    >
      <CalloutTitle
        className={callout.className.title}
        type={type}
        isFoldable={isFoldableString}
      >
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
};

const Details: FC<DetailsProps> = ({
  isFoldable,
  defaultFolded,
  children,
  ...props
}) => {
  return isFoldable ? (
    <details open={!defaultFolded} {...props}>
      {children}
    </details>
  ) : (
    <div {...props}>{children}</div>
  );
};

type SummaryProps = {
  isFoldable: boolean;
  children: ReactNode;
  className?: string;
};

const Summary: FC<SummaryProps> = ({ isFoldable, children, ...props }) => {
  return isFoldable ? (
    <summary {...props}>{children}</summary>
  ) : (
    <div {...props}>{children}</div>
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

  return (
    <Details
      isFoldable={isFoldable}
      defaultFolded={defaultFolded}
      className={clsx(
        "group/root my-6 space-y-2 rounded-lg border bg-card p-2",
        callout.className.root,
        className
      )}
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
    <Summary
      isFoldable={isFoldable}
      className={clsx(
        "flex flex-row items-center gap-2",
        callout.className.title
      )}
    >
      {callout.icon}
      <span>{children ?? callout.label}</span>
      {isFoldable && (
        <FaChevronRight className="size-3 shrink-0 transition-transform group-open/root:rotate-90" />
      )}
    </Summary>
  );
};

export type CalloutBodyProps = {
  className?: string;
  children: ReactNode;
};

export const CalloutBody: FC<CalloutBodyProps> = ({ children }) => {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2",
        "prose-headings:my-0 prose-p:my-0 prose-blockquote:my-0 prose-pre:my-0 prose-ol:my-0 prose-ul:my-0"
      )}
    >
      {children}
    </div>
  );
};
