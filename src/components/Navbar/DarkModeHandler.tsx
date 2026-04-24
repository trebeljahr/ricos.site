import { IoMoon, IoSunny } from "@components/Icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const DarkModeHandler = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      className="ml-0 md:ml-3 mr-3 md:mr-0 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 inline-flex items-center justify-center rounded-md"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      {mounted ? resolvedTheme === "dark" ? <IoMoon /> : <IoSunny /> : <span className="w-4 h-4" />}
    </button>
  );
};
