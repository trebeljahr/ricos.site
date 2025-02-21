import { useState } from "react";
import { FaCheck, FaShareAlt } from "react-icons/fa";

export const ShareWithOthersButton = () => {
  const handleClick = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const [disabled, setDisabled] = useState(false);

  const handleClickAndDisable = () => {
    handleClick();
    setDisabled(true);
    setTimeout(() => {
      setDisabled(false);
    }, 3000);
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClickAndDisable}
      className="w-fit h-fit absolute p-3 bottom-2 right-2 z-10 flex place-items-center bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
    >
      {disabled ? (
        <span className="text-sm flex place-items-center">
          Copied URL for Sharing{" "}
          <FaCheck className="ml-5 size-4 text-green-500 dark:text-green-400" />
        </span>
      ) : (
        <FaShareAlt className="size-4 text-gray-700 dark:text-gray-200" />
      )}
    </button>
  );
};
