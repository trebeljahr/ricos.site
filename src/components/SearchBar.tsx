import {
  ChangeEvent,
  Dispatch,
  Fragment,
  SetStateAction,
  useState,
} from "react";
import { nanoid } from "nanoid";
import React from "react";

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
  if (typeof value === "number") return 10;
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
  const [filters, setFilters] = useState(createFilters(emptyFilters));
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
    <div className="search">
      <p>Search by:</p>

      {Object.entries(filters)
        .filter(([, { active }]) => active)
        .map(([filterKey, { value: filterValue, options }]) => {
          return (
            <Fragment key={filterKey}>
              <div className="search-filter dark:bg-gray-900 bg-gray-200">
                <button
                  className="remove-filter-button"
                  onClick={() => toggleFilter(filterKey)}
                >
                  <span className="icon-close"></span>
                </button>
                <p>{beautify(filterKey, { capitalize: true })}:</p>
                <InputField
                  options={options}
                  growArray={growArray}
                  filterKey={filterKey}
                  filterValue={filterValue}
                  toggleBoolean={toggleBoolean}
                  handleInput={handleInput}
                />
                {Array.isArray(filterValue) && (
                  <button onClick={() => growArray(filterKey)}>
                    <span className="icon-plus"></span>
                  </button>
                )}
              </div>
              <div className="tag-filter-container">
                {Array.isArray(filterValue) &&
                  filterValue.map((tag, index) => {
                    if (index === filterValue.length - 1) return null;
                    return (
                      <div className="tag-filter" key={tag.id}>
                        <p>{tag.tag}</p>
                        <button onClick={() => removeTag(filterKey, tag.id)}>
                          <span className="icon-bin"></span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </Fragment>
          );
        })}
      <div>
        <div className="add-filter-container">
          {Object.entries(filters)
            .filter(([, { active }]) => !active)
            .map(([filterKey]) => {
              return (
                <button
                  key={filterKey}
                  className="add-filter-button"
                  onClick={() => toggleFilter(filterKey)}
                >
                  <span className="icon-plus"></span>

                  <p>{beautify(filterKey, { capitalize: true })}</p>
                </button>
              );
            })}
        </div>
      </div>
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
      <button onClick={() => toggleBoolean(filterKey)}>
        {filterValue ? "yes" : "no"}
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
        className="dark:bg-gray-800 h-5"
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
      // <input
      //   id={filterKey}
      //   type={"text"}
      //   name={filterKey}
      //   onChange={(event) => handleInput(event)}
      //   onKeyPress={(event) => {
      //     event.key === "Enter" && growArray(filterKey);
      //   }}
      //   value={filterValue[filterValue.length - 1]?.tag ?? ""}
      // />
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
  return (
    <Fragment key={filterKey}>
      <input
        id={filterKey}
        name={filterKey}
        list={`auto-complete-${filterKey}`}
        type="text"
        value={filterValue}
        onChange={(event) => handleInput(event)}
        onKeyPress={(event) => {
          event.key === "Enter" && growArray && growArray(filterKey);
        }}
        className="dark:bg-gray-800 h-5"
      />
      <datalist id={`auto-complete-${filterKey}`}>
        {options.map((val) => (
          <option key={val} value={val}>
            {val}
          </option>
        ))}
      </datalist>
    </Fragment>
  );
};
