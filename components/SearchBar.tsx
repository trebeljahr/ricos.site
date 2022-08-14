import { ChangeEvent, Dispatch, SetStateAction, useState } from "react";

type SearchProps<Filters> = {
  setFilters: Dispatch<SetStateAction<Filters>>;
  filters: Filters;
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

type FilterValue = string | number | string[] | boolean;
type EmptyFilters = Record<string, FilterValue>;

type Filter = {
  active: boolean;
  value: FilterValue;
};
type Filters = Record<string, Filter>;

export function createFilters<T extends EmptyFilters>(
  emptyFilters: T
): Filters {
  const filters = Object.entries(emptyFilters).map(([key, value]) => [
    key,
    { value, active: false },
  ]);
  return Object.fromEntries(filters);
}

export function useSearch<T extends EmptyFilters>(emptyFilters: T) {
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
        for (let filter of filterValue as string[]) {
          if (
            !val.some((valString) => valString.includes(filter)) &&
            filter !== ""
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
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const filter = event.target.name;
    setFilters((old) => {
      const { value } = old[filter];
      console.log("value", value);
      return {
        ...old,
        [filter]: {
          ...old[filter],
          value:
            typeof value === "number"
              ? Number(event.target.value)
              : typeof value === "string" || typeof value === "boolean"
              ? event.target.value
              : value.map((val, index) => {
                  if (index === value.length - 1) {
                    return event.target.value;
                  }
                  return val;
                }),
        },
      };
    });
  };

  const growArray = (filterName: string) => {
    setFilters((old) => {
      const val = old[filterName].value;
      Array.isArray(val) && val.push("");
      return { ...old };
    });
  };

  const removeTag = (filterName: string, indexToDelete: number) => {
    setFilters((old) => {
      const val = old[filterName];
      if (Array.isArray(val))
        return {
          ...old,
          [filterName]: {
            ...old[filterName],
            value: val.filter((_, index) => index !== indexToDelete),
          },
        };
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
    <div className="searchBar">
      {Object.entries(filters).map(
        ([filterName, { value: filterValue, active }]) => {
          return (
            <div key={filterName}>
              <button onClick={() => toggleFilter(filterName)}>
                {active ? "active" : "inactive"}
              </button>
              <label htmlFor={filterName}>{filterName}:</label>
              {typeof filterValue === "boolean" ? (
                <button onClick={() => toggleBoolean(filterName)}>
                  {filterValue ? "true" : "false"}
                </button>
              ) : (
                <input
                  id={filterName}
                  type={
                    typeof filterValue === "string" ||
                    Array.isArray(filterValue)
                      ? "text"
                      : "number"
                  }
                  name={filterName}
                  onChange={handleInput}
                  onKeyPress={(event) => {
                    event.key === "Enter" && growArray(filterName);
                  }}
                  value={
                    Array.isArray(filterValue)
                      ? filterValue[filterValue.length - 1]
                      : filterValue
                  }
                />
              )}
              {Array.isArray(filterValue) && (
                <button onClick={() => growArray(filterName)}>Add tag</button>
              )}
              {Array.isArray(filterValue) &&
                filterValue
                  .slice(0, filterValue.length - 1)
                  .map((filter, index) => {
                    return (
                      <div key={filter + index}>
                        <p>{filter}</p>
                        <button onClick={() => removeTag(filterName, index)}>
                          Delete
                        </button>
                      </div>
                    );
                  })}
            </div>
          );
        }
      )}
    </div>
  );
}
