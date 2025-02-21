import { CollapsibleMenuMobile } from "@components/Navbar/CollapsibleMenus";
import { DarkModeHandler } from "@components/Navbar/DarkModeHandler";
import {
  about,
  navigation,
  resources,
  RicosSiteBanner,
} from "@components/Navbar/TailwindNavbar";
import clsx from "clsx";
import type { Variants } from "motion/react";
import * as motion from "motion/react-client";
import Link from "next/link";
import { PropsWithChildren, useRef, useState } from "react";
import useMeasure from "react-use-measure";

export const LeftNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [ref, { height }] = useMeasure();

  return (
    <motion.nav
      initial={false}
      animate={isOpen ? "open" : "closed"}
      className="fixed z-50 h-screen"
    >
      <motion.div
        className="absolute top-0 left-0 bottom-0 w-[300px] h-screen bg-gray-200 dark:bg-gray-800"
        variants={sidebarVariants}
        custom={height}
        ref={ref}
      />
      <Navigation />
      <MenuToggle toggle={() => setIsOpen(!isOpen)} />
    </motion.nav>
  );
};
const navVariants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const Navlink = ({ link, left = true }: { link: string; left?: boolean }) => {
  return (
    <Link
      href={`/${link}`}
      className={clsx(
        "block w-fit rounded-md px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700",
        left ? "text-left" : "text-right"
      )}
    >
      {link}
    </Link>
  );
};

const AnimatedMenuItem = ({ children }: PropsWithChildren) => {
  return (
    <motion.div
      className="flex items-center justify-start p-0 m-0 mb-2 cursor-pointer rounded-md w-fit"
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
};

const Navigation = () => {
  return (
    <motion.nav
      className="m-0 absolute top-16 left-0 px-3 prose-a:no-underline prose-a:hover:text-inherit prose-a:font-normal font-normal prose-a:text-inherit"
      variants={navVariants}
    >
      <AnimatedMenuItem>
        <div className="flex place-items-center">
          <RicosSiteBanner />
          <DarkModeHandler />
        </div>
      </AnimatedMenuItem>

      {navigation.map((link) => (
        <AnimatedMenuItem key={link}>
          <Navlink link={link} />
        </AnimatedMenuItem>
      ))}
      <AnimatedMenuItem>
        <CollapsibleMenuMobile links={resources} text="resources" left />
      </AnimatedMenuItem>
      <AnimatedMenuItem>
        <CollapsibleMenuMobile links={about} text="about" left />
      </AnimatedMenuItem>
    </motion.nav>
  );
};

const itemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
};

const sidebarVariants = {
  open: (height: number) => {
    return {
      clipPath: `circle(${height * 2 + 200}px at 40px 40px)`,
      transition: {
        type: "spring",
        stiffness: 20,
        restDelta: 2,
      },
    };
  },
  closed: {
    clipPath: "circle(20px at 26px 28px)",
    transition: {
      delay: 0.2,
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

interface PathProps {
  d?: string;
  variants: Variants;
  transition?: { duration: number };
}

const Path = (props: PathProps) => (
  <motion.path
    fill="transparent"
    strokeWidth="3"
    // stroke="hsl(0, 0%, 18%)"
    strokeLinecap="round"
    {...props}
  />
);

const MenuToggle = ({ toggle }: { toggle: () => void }) => (
  <button
    className="outline-none border-none select-none cursor-pointer absolute top-[18px] left-[15px] rounded-full bg-transparent"
    onClick={toggle}
  >
    <svg
      width="23"
      height="23"
      viewBox="0 0 23 23"
      className="stroke-black dark:stroke-white"
    >
      <Path
        variants={{
          closed: { d: "M 2 2.5 L 20 2.5" },
          open: { d: "M 3 16.5 L 17 2.5" },
        }}
      />
      <Path
        d="M 2 9.423 L 20 9.423"
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 },
        }}
        transition={{ duration: 0.1 }}
      />
      <Path
        variants={{
          closed: { d: "M 2 16.346 L 20 16.346" },
          open: { d: "M 3 2.5 L 17 16.346" },
        }}
      />
    </svg>
  </button>
);
