import clsx from "clsx";
import type { FC, ReactNode } from "react";
import {
  FaRocket,
  FaLightbulb,
  FaCheck,
  FaQuestion,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSkullCrossbones,
  FaBug,
  FaQuoteLeft,
  FaInfoCircle,
  FaClipboardList,
  FaCode,
  FaChevronRight,
} from "react-icons/fa";

type Callout = {
  label: string;
  icon: ReactNode;
  className: {
    root: string;
    title: string;
  };
};

export const callouts = {
  // Group: Abstract
  abstract: {
    label: "Abstract",
    // Aliases: [!abstract], [!summary], [!tldr]
    aliases: ["abstract", "summary", "tldr"],
    icon: <FaRocket className="size-5 shrink-0" />,
    className: {
      root: "bg-purple-500/10 border-purple-600/20 dark:border-purple-800/20",
      title: "text-purple-600 dark:text-purple-400",
    },
  },

  // Group: Tip (aliases: tip, hint, important)
  tip: {
    label: "Tip",
    aliases: ["tip", "hint", "important"],
    icon: <FaLightbulb className="size-5 shrink-0" />,
    // Using a teal palette for tip
    className: {
      root: "bg-teal-500/10 border-teal-600/20 dark:border-teal-800/20",
      title: "text-teal-600 dark:text-teal-400",
    },
  },

  // Group: Success (aliases: success, check, done)
  success: {
    label: "Success",
    aliases: ["success", "check", "done"],
    icon: <FaCheck className="size-5 shrink-0" />,
    className: {
      root: "bg-green-500/10 border-green-600/20 dark:border-green-800/20",
      title: "text-green-600 dark:text-green-400",
    },
  },

  // Group: Question (aliases: question, help, faq)
  question: {
    label: "Question",
    aliases: ["question", "help", "faq"],
    icon: <FaQuestion className="size-5 shrink-0" />,
    className: {
      root: "bg-yellow-500/10 border-yellow-600/20 dark:border-yellow-800/20",
      title: "text-yellow-600 dark:text-yellow-400",
    },
  },

  // Group: Warning (aliases: warning, caution, attention)
  warning: {
    label: "Warning",
    aliases: ["warning", "caution", "attention"],
    icon: <FaExclamationTriangle className="size-5 shrink-0" />,
    // Here we use an amber tone
    className: {
      root: "bg-amber-500/10 border-amber-600/20 dark:border-amber-800/20",
      title: "text-amber-600 dark:text-amber-400",
    },
  },

  // Group: Failure (aliases: failure, fail, missing)
  failure: {
    label: "Failure",
    aliases: ["failure", "fail", "missing"],
    icon: <FaTimesCircle className="size-5 shrink-0" />,
    className: {
      root: "bg-red-500/10 border-red-600/20 dark:border-red-800/20",
      title: "text-red-600 dark:text-red-400",
    },
  },

  // Group: Danger (aliases: danger, error)
  danger: {
    label: "Danger",
    aliases: ["danger", "error"],
    icon: <FaSkullCrossbones className="size-5 shrink-0" />,
    // Using a pink palette here to differentiate from failure
    className: {
      root: "bg-pink-500/10 border-pink-600/20 dark:border-pink-800/20",
      title: "text-pink-600 dark:text-pink-400",
    },
  },

  // Group: Misc – Bug
  bug: {
    label: "Bug",
    aliases: ["bug"],
    icon: <FaBug className="size-5 shrink-0" />,
    className: {
      root: "bg-orange-500/10 border-orange-600/20 dark:border-orange-800/20",
      title: "text-orange-600 dark:text-orange-400",
    },
  },

  // Group: Misc – Quote
  quote: {
    label: "Quote",
    aliases: ["quote"],
    icon: <FaQuoteLeft className="size-5 shrink-0" />,
    className: {
      root: "bg-gray-500/10 border-gray-600/20 dark:border-gray-800/20",
      title: "text-gray-600 dark:text-gray-400",
    },
  },

  // Group: Misc – Info
  info: {
    label: "Info",
    aliases: ["info"],
    icon: <FaInfoCircle className="size-5 shrink-0" />,
    className: {
      root: "bg-blue-500/10 border-blue-600/20 dark:border-blue-800/20",
      title: "text-blue-600 dark:text-blue-400",
    },
  },

  // Group: Misc – To Do
  todo: {
    label: "To Do",
    aliases: ["todo"],
    icon: <FaClipboardList className="size-5 shrink-0" />,
    className: {
      root: "bg-indigo-500/10 border-indigo-600/20 dark:border-indigo-800/20",
      title: "text-indigo-600 dark:text-indigo-400",
    },
  },

  // Group: Misc – Example
  example: {
    label: "Example",
    aliases: ["example"],
    icon: <FaCode className="size-5 shrink-0" />,
    className: {
      root: "bg-violet-500/10 border-violet-600/20 dark:border-violet-800/20",
      title: "text-violet-600 dark:text-violet-400",
    },
  },
};

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
        "group/root my-6 space-y-2 rounded-lg border bg-card p-4",
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
        "flex flex-row items-center gap-2 font-bold",
        callout.className.title
      )}
    >
      {callout.icon}
      <div>{children ?? callout.label}</div>
      {isFoldable && (
        <FaChevronRight className="size-5 shrink-0 transition-transform group-open/root:rotate-90" />
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
