import { SearchIcon } from "@/components/icons";

/**
 * A 40dp surface-2 search field with a magnifier and "Search" placeholder
 * (DESIGN.md §12). Pass `name` and `defaultValue` to use it inside a GET form.
 */
export function SearchPill({
  name = "q",
  defaultValue,
  placeholder = "Search",
  className = "",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={`relative flex h-10 w-full items-center rounded-[14px] bg-surface-2 ${className}`}
    >
      <SearchIcon
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-muted"
      />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full appearance-none bg-transparent pl-10 pr-3 text-base text-text placeholder:text-muted focus:outline-none"
      />
    </label>
  );
}
