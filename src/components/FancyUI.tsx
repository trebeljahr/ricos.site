import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

export const FancyButton = (props: JSX.IntrinsicElements["button"]) => {
  return (
    <button
      {...props}
      className={
        props.className +
        " relative inline-flex no-underline items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800"
      }
    >
      <span className="w-full relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
        {props.children}
      </span>
    </button>
  );
};

export const FancyLink = ({
  href,
  text = "Read More",
}: {
  href: string;
  text?: string;
}) => {
  return (
    <Link
      href={href}
      className="mt-2 relative inline-flex no-underline items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:!text-white dark:!text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800"
    >
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
        {text} <FaArrowRightLong className="inline ml-2" />
      </span>
    </Link>
  );
};
