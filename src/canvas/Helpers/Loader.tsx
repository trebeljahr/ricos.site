import { useProgress } from "@hooks/useProgress";
import clsx from "clsx";
import { useEffect, useState } from "react";

interface LoaderProps {
  className?: string;
}

export const Loader = ({ className = "" }: LoaderProps) => {
  const { progress, errors, item, loaded, total } = useProgress();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(() => {
        setShowLoader(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  if (!showLoader || total === 0) return null;

  return (
    <div
      className={clsx(
        // not-prose: the body carries prose classes, which would restyle the heading.
        "not-prose fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-gray-900 transition-opacity duration-500 dark:bg-gray-900 dark:text-gray-100",
        progress === 100 ? "opacity-0" : "opacity-100",
        className,
      )}
    >
      <div className="max-w-md w-full px-4">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold">Loading 3D Scene</h2>
          {item && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs mx-auto">
              {item}
            </p>
          )}
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-myBlue h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-300 tabular-nums">
          <span>{Math.round(progress)}%</span>
          {total === 0 ? null : (
            <span>
              {loaded}/{total} assets
            </span>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-4 text-sm text-darkRed dark:text-lightRed">
            <p>Error loading: {errors[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Loader;
