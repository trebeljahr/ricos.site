import { useTheme } from "next-themes";
import { IoMoon, IoSunny } from "react-icons/io5";

export const DarkModeHandler = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      className="mr-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 inline-flex items-center justify-center rounded-md"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? <IoMoon /> : <IoSunny />}
    </button>
  );
};
