import Link from "next/link";

export function turnKebabIntoTitleCase(kebab: string) {
  return kebab
    .split("-")
    .map(
      (substring) => substring.slice(0, 1).toUpperCase() + substring.slice(1)
    )
    .join(" ");
}

export function BreadCrumbs({ path }: { path: string }) {
  const pathParts = path.split("/").filter((part) => part !== "");

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue "
          >
            <svg
              className="w-3 h-3 mr-2.5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
            </svg>
            Home
          </Link>
        </li>
        {pathParts.map((part) => {
          return (
            <li key={part}>
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <Link
                  href={"/" + part}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue md:ml-2"
                >
                  {turnKebabIntoTitleCase(part)}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
