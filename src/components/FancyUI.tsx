import { FaArrowRightLong } from "@components/Icons";
import Link from "next/link";

export const FancyButton = ({
  loading = false,
  className,
  children,
  ...props
}: JSX.IntrinsicElements["button"] & { loading?: boolean }) => {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={
        `${className ?? ""}` +
        " relative inline-flex no-underline items-center justify-center p-0.5 overflow-hidden font-medium text-gray-900 rounded-lg group bg-linear-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:text-white focus-visible:text-white data-loading:text-white dark:text-white transition-colors duration-300 focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 cursor-pointer data-loading:cursor-wait"
      }
    >
      <span className="flex justify-center w-full relative overflow-hidden px-5 py-2.5 bg-white dark:bg-gray-900 rounded-md">
        <span
          aria-hidden
          className="absolute inset-y-0 -left-4 w-[180%] -skew-x-12 -translate-x-full bg-[linear-gradient(to_right,var(--color-green-400),var(--color-teal-400)_33%,var(--color-blue-600)_66%)] mask-r-from-66% mask-r-to-100% transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:animate-shimmer-drift group-focus-visible:translate-x-0 group-data-loading:translate-x-0 group-data-loading:animate-shimmer-drift motion-reduce:transition-none motion-reduce:animate-none"
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:animate-shimmer-glint group-data-loading:animate-shimmer-glint-loop motion-reduce:hidden"
        />
        <span className="relative flex justify-center w-full">{children}</span>
      </span>
    </button>
  );
};

export const LoadingDots = ({ label }: { label: string }) => (
  <span role="status" className="inline-flex items-center gap-1.5">
    {label}
    <span aria-hidden className="inline-flex gap-0.5 pt-1.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1 rounded-full bg-current animate-dot-rise motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  </span>
);

export const FancyLink = ({ href, text = "Read More" }: { href: string; text?: string }) => {
  return (
    <Link
      href={href}
      className="mt-2 relative inline-flex no-underline items-center justify-center p-0.5 mb-2 me-2 overflow-hidden font-medium text-gray-900 rounded-lg group bg-linear-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:text-white! dark:text-white! focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800"
    >
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent dark:group-hover:bg-transparent">
        {text} <FaArrowRightLong className="inline ml-2" />
      </span>
    </Link>
  );
};
