import { useEffect, useMemo } from "react";
import { IoMoon, IoSunny } from "react-icons/io5";
import { useMediaQuery } from "react-responsive";
import useLocalStorageState from "use-local-storage-state";
import React from "react";
import { useTheme } from "next-themes";

export const DarkModeHandler = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      className="mr-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <IoMoon /> : <IoSunny />}
    </button>
  );
};
