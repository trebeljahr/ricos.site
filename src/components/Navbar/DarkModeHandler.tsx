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
      className="inline-flex size-9 items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <IoMoon className="size-4" />
        ) : (
          <IoSunny className="size-4" />
        )
      ) : (
        <span className="size-4" />
      )}
    </button>
  );
};
