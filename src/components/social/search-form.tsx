// A plain GET form — no client JavaScript required, fully keyboard usable.
// `compact` renders the small header variant (visually-hidden label, no
// separate submit label besides an icon-free "Go").
export function SearchForm({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={compact ? "flex items-center gap-2" : "flex flex-wrap gap-2"}
    >
      <label htmlFor={compact ? "q-compact" : "q"} className={compact ? "sr-only" : "sr-only"}>
        Search people and posts
      </label>
      <input
        id={compact ? "q-compact" : "q"}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search people and posts"
        minLength={2}
        maxLength={100}
        className={`min-h-11 rounded-full border border-[#cfc8bb] bg-white px-4 text-sm text-[#1d2420] outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40 ${
          compact ? "w-40 sm:w-56" : "flex-1"
        }`}
      />
      <button
        type="submit"
        className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#263b2d]"
      >
        Search
      </button>
    </form>
  );
}
