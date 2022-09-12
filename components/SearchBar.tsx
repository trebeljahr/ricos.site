import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, Dispatch, SetStateAction, useState } from "react";
import { faPlus, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { nanoid } from "nanoid";

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
type EmptyFilters = Record<string, EmptyFilterValue>;

type FilterValue = string | number | Tag[] | boolean;
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
        .map(([filterName, { value: filterValue }]) => {
          return (
            <>
              <div className="search-filter">
                <button
                  className="remove-filter-button"
                  onClick={() => toggleFilter(filterName)}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
                <p>{filterName}</p>
                <p className="search-filter-equal-sign">=</p>
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
                    min={typeof filterValue === "number" ? 0 : undefined}
                    max={typeof filterValue === "number" ? 10 : undefined}
                    name={filterName}
                    onChange={(event) => handleInput(event)}
                    onKeyPress={(event) => {
                      event.key === "Enter" && growArray(filterName);
                    }}
                    value={
                      Array.isArray(filterValue)
                        ? filterValue[filterValue.length - 1]?.tag ?? ""
                        : filterValue
                    }
                  />
                )}
                {Array.isArray(filterValue) && (
                  <button onClick={() => growArray(filterName)}>
                    <FontAwesomeIcon icon={faPlus} />
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
                        <button onClick={() => removeTag(filterName, tag.id)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </>
          );
        })}
      <div>
        <div className="add-filter-container">
          {Object.entries(filters)
            .filter(([, { active }]) => !active)
            .map(([filterName]) => {
              return (
                <button
                  key={filterName}
                  className="add-filter-button"
                  onClick={() => toggleFilter(filterName)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <p> {filterName}</p>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
