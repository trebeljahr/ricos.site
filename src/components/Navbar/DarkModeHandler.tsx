import { useEffect, useMemo } from "react";
import { IoMoon, IoSunny } from "react-icons/io5";
import { useMediaQuery } from "react-responsive";
import useLocalStorageState from "use-local-storage-state";
import React from "react";

export const DarkModeHandler = () => {
  const [isDark, toggleDarkmode] = useColorScheme();

  return (
    <button
      className="mr-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
      onClick={toggleDarkmode}
    >
      {isDark ? <IoMoon /> : <IoSunny />}
    </button>
  );
};

export function useColorScheme() {
  const systemPrefersDark = useMediaQuery({
    query: "(prefers-color-scheme: dark)",
  });

  const [isDark, setIsDark] = useLocalStorageState<boolean | undefined>(
    "theme",
    {
      defaultValue: undefined,
    }
  );

  const value = useMemo(
    () => (isDark === undefined ? systemPrefersDark : isDark),
    [isDark, systemPrefersDark]
  );

  useEffect(() => {
    console.log("value", value);
    if (value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [value]);

  const toggleDarkMode = () => {
    setIsDark(!value);
  };

  return [value, toggleDarkMode] as [boolean, () => void];
}
