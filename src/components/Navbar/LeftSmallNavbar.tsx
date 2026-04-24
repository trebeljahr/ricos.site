import { FiMenu, FiX } from "@components/Icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { CollapsibleMenuMobile } from "./CollapsibleMenus";
import { DarkModeHandler } from "./DarkModeHandler";
import { RicosSiteBanner } from "./TailwindNavbar";

const navigation = ["posts", "newsletters", "photography"];
const resources = ["quotes", "booknotes", "needlestack", "podcastnotes", "r3f"];
const about = ["now", "travel", "principles", "1-month-projects", "support", "imprint"];

export const LeftSmallNavbar = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <>
      <div className="prose-a:no-underline prose-a:hover:text-inherit prose-a:font-normal font-normal prose-a:text-inherit">
        <button
          type="button"
          className={`fixed top-2 z-50 bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center rounded-full p-3 transition-[left] duration-300 ${
            open ? "left-[175px]" : "left-2"
          }`}
          onClick={toggle}
        >
          <span className="sr-only">Open main menu</span>
          {open ? <FiX className="size-4" /> : <FiMenu className="size-4" />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ duration: 0.3 }}
              className="absolute z-40 top-0 left-0 py-2 w-[220px] h-screen  bg-white dark:bg-gray-900"
            >
              <div className="absolute bottom-2 right-2">
                <DarkModeHandler />
              </div>

              <div className="flex flex-col pb-3 pt-2 px-3 items-start justify-start">
                <RicosSiteBanner />
                <div className="pt-3">
                  {navigation.map((item) => (
                    <Link
                      key={item}
                      href={"/" + item}
                      className="block w-fit rounded-md px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 "
                    >
                      {item}
                    </Link>
                  ))}

                  <CollapsibleMenuMobile links={resources} text="resources" closeNav={close} left />
                  <CollapsibleMenuMobile links={about} text="about" closeNav={close} left />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
