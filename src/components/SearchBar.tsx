import { nanoid } from "nanoid";
import {
  ChangeEvent,
  Dispatch,
  Fragment,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiPlus, FiTrash, FiX } from "react-icons/fi";

type SearchProps<Filters> = {
  setFilters: Dispatch<SetStateAction<Filters>>;
  filters: Filters;
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export interface Tag {
  tag: string;
  id: string;
}

type EmptyFilterValue = string | number | string[] | boolean;
type EmptyFilters = Record<string, EmptyFilterValue>[];

type FilterValue = string | number | Tag[] | boolean;
type Filter = {
  active: boolean;
  value: FilterValue;
  options: string[] | number[] | boolean[];
};

type Filters = Record<string, Filter>;

function makeEmptyForType(value: string | number | boolean | string[]) {
  if (typeof value === "string") return "";
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return 0;
  if (Array.isArray(value)) return [];
  throw new TypeError("Filter Type is not supported!");
}

export function createFilters<T extends EmptyFilters>(
  emptyFilters: T
): Filters {
  const filters = emptyFilters.reduce<Filters>((agg, filterableObject) => {
    for (let [key, value] of Object.entries(filterableObject)) {
      if (!agg[key]) {
        if (Array.isArray(value)) {
          agg[key] = {
            value: makeEmptyForType(value),
            active: false,
            options: value,
          };
        } else {
          agg[key] = {
            value: makeEmptyForType(value),
            active: false,
            options: [value] as string[] | number[] | boolean[],
          };
        }
      } else {
        agg[key] = {
          ...agg[key],
          options: [...new Set([...agg[key].options, value].flat())] as [],
        };
      }
    }
    return agg;
  }, {});

  return filters;
}

export function useSearch<T extends Record<string, EmptyFilterValue>>(
  emptyFilters: T[]
) {
  const [filters, setFilters] = useState(() => createFilters(emptyFilters));
  const entries = Object.entries(filters) as Entries<Filters>;

  const byFilters = (item: T) => {
    for (let [filterKey, filter] of entries) {
      const { value: filterValue, active: filterIsActive } = filter;

      if (!filterIsActive) continue;

      const val = item[filterKey];
      if (typeof val === "string" && typeof filterValue === "string") {
        if (!val.toLowerCase().includes(filterValue.toLowerCase())) {
          return false;
        }
      } else if (Array.isArray(filterValue) && Array.isArray(val)) {
        for (let tag of filterValue) {
          let tagsToSearch = val as unknown as string[];
          if (
            !tagsToSearch.some((tags) => tags.includes(tag.tag)) &&
            tag.tag !== ""
          ) {
            return false;
          }
        }
      } else if (typeof val === "number" && typeof filterValue === "number") {
        if (val !== filterValue) {
          return false;
        }
      } else if (typeof val === "boolean" && typeof filterValue === "boolean") {
        if (val !== filterValue) {
          return false;
        }
      }
    }

    return true;
  };
  return { byFilters, filters, setFilters };
}

export function Search<T extends Filters>({
  setFilters,
  filters,
}: SearchProps<T>) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>, id = "") => {
    const filter = event.target.name;
    setFilters((old) => {
      const { value: oldValue } = old[filter];
      let newValue;
      switch (typeof oldValue) {
        case "number":
          newValue = Number(event.target.value);
          break;
        case "string":
        case "boolean":
          newValue = event.target.value;
          break;
        default:
          newValue =
            oldValue.length >= 1
              ? oldValue.map((val, index) => {
                  if (index === oldValue.length - 1) {
                    return { tag: event.target.value, id: val.id };
                  }
                  return val;
                })
              : [{ tag: "", id: nanoid() }];
      }

      return {
        ...old,
        [filter]: {
          ...old[filter],
          value: newValue,
        },
      };
    });
  };

  const growArray = (filterName: string) => {
    setFilters((old) => {
      const val = old[filterName].value;
      if (Array.isArray(val) && val[val.length - 1]?.tag !== "") {
        val.push({ tag: "", id: nanoid() });
      }
      return { ...old };
    });
  };

  const removeTag = (filterName: string, idToDelete: string) => {
    setFilters((old) => {
      const val = old[filterName].value;

      if (Array.isArray(val)) {
        return {
          ...old,
          [filterName]: {
            ...old[filterName],
            value: (val as Tag[]).filter(({ id }) => {
              return id !== idToDelete;
            }),
          },
        };
      }

      return old;
    });
  };

  const toggleBoolean = (filterName: string) => {
    setFilters((old) => ({
      ...old,
      [filterName]: { ...old[filterName], value: !old[filterName].value },
    }));
  };

  const toggleFilter = (filterName: string) => {
    setFilters((old) => {
      return {
        ...old,
        [filterName]: { ...old[filterName], active: !old[filterName].active },
      };
    });
  };

  return (
    <div className="not-prose p-4 bg-gray-100 dark:bg-slate-800 rounded-lg shadow-md min-h-[300px]">
      <p className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Search by:
      </p>

      {Object.entries(filters).map(
        ([filterKey, { active, value: filterValue, options }]) => {
          return (
            <Fragment key={filterKey}>
              <div
                className={`${
                  active
                    ? "bg-gray-200 dark:bg-slate-700"
                    : "bg-white dark:bg-slate-800"
                } flex items-center gap-2 p-2 rounded-md mb-2 transition-colors duration-200`}
              >
                <button
                  onClick={() => toggleFilter(filterKey)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  aria-label={active ? "Remove filter" : "Add filter"}
                >
                  {active ? (
                    <FiX className="w-5 h-5" />
                  ) : (
                    <FiPlus className="w-5 h-5" />
                  )}
                </button>
                <p className="text-gray-700 dark:text-gray-300 min-w-fit">
                  {beautify(filterKey, { capitalize: true })}:
                </p>
                {active && (
                  <InputField
                    options={options}
                    growArray={growArray}
                    filterKey={filterKey}
                    filterValue={filterValue}
                    toggleBoolean={toggleBoolean}
                    handleInput={handleInput}
                  />
                )}
                {Array.isArray(filterValue) && active && (
                  <button
                    onClick={() => growArray(filterKey)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                    aria-label="Add another filter"
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="ml-8 mb-2">
                {Array.isArray(filterValue) &&
                  active &&
                  filterValue.map((tag, index) => {
                    if (index === filterValue.length - 1) return null;
                    return (
                      <div
                        key={tag.id}
                        className="inline-flex items-center gap-2 mb-1 mr-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900 dark:text-blue-300"
                      >
                        <span>{tag.tag}</span>
                        <button
                          onClick={() => removeTag(filterKey, tag.id)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 transition-colors duration-200"
                          aria-label="Remove Tag from filters"
                        >
                          <FiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </Fragment>
          );
        }
      )}
    </div>
  );
}

function beautify(filterKey: string, { capitalize = false }) {
  const filterName = filterKey
    .split(/(?=[A-Z])/)
    .map((str) => str.toLowerCase())
    .map((str) =>
      capitalize ? str.charAt(0).toUpperCase() + str.slice(1) : str
    )
    .join(" ");
  return filterName;
}

type InputFieldProps = {
  filterValue: boolean | string | number | Tag[];
  toggleBoolean(filterName: string): void;
  filterKey: string;
  handleInput(event: ChangeEvent<HTMLInputElement>): void;
  growArray(filterName: string): void;
  options: string[] | number[] | boolean[];
};

const InputField = ({
  filterValue,
  toggleBoolean,
  filterKey,
  handleInput,
  growArray,
  options,
}: InputFieldProps) => {
  if (typeof filterValue === "boolean")
    return (
      <button
        onClick={() => toggleBoolean(filterKey)}
        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
        aria-label="Toggle Value of this filter"
      >
        {filterValue ? "Yes" : "No"}
      </button>
    );

  if (typeof filterValue === "number")
    return (
      <input
        id={filterKey}
        type="number"
        min={0}
        max={10}
        name={filterKey}
        onChange={(event) => handleInput(event)}
        value={filterValue}
        className="w-16 px-2 py-1 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:focus:ring-blue-400"
      />
    );

  if (typeof filterValue === "string")
    return (
      <AutoCompleteInput
        filterKey={filterKey}
        options={options as string[]}
        handleInput={handleInput}
        filterValue={filterValue}
      />
    );

  if (Array.isArray(filterValue))
    return (
      <AutoCompleteInput
        filterKey={filterKey}
        options={options as string[]}
        handleInput={handleInput}
        filterValue={filterValue[filterValue.length - 1]?.tag ?? ""}
        growArray={growArray}
      />
    );

  return null;
};

type AutoCompleteInputProps = {
  filterKey: string;
  options: string[];
  filterValue: string;
  handleInput(event: ChangeEvent<HTMLInputElement>): void;
  growArray?: (filterName: string) => void;
};

const AutoCompleteInput = ({
  options,
  filterValue,
  filterKey,
  handleInput,
  growArray,
}: AutoCompleteInputProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option: string) => {
    handleInput({
      target: { name: filterKey, value: option },
    } as ChangeEvent<HTMLInputElement>);
    setShowOptions(false);
    if (growArray) {
      growArray(filterKey);
    }
  };

  return (
    <div className="relative w-full" ref={inputRef}>
      <input
        id={filterKey}
        name={filterKey}
        type="text"
        value={filterValue}
        onChange={(event) => {
          handleInput(event);
          setShowOptions(true);
        }}
        onFocus={() => setShowOptions(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && growArray) {
            growArray(filterKey);
            setShowOptions(false);
          }
        }}
        className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:focus:ring-blue-400"
      />
      {showOptions && (
        <ul
          ref={optionsRef}
          className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg dark:bg-slate-700 dark:border-slate-600"
        >
          {options
            .filter((option) =>
              option
                .toLocaleLowerCase()
                .includes(filterValue.toLocaleLowerCase())
            )
            .map((option) => (
              <li
                key={option}
                onClick={() => handleOptionClick(option)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-200"
              >
                {option}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};
