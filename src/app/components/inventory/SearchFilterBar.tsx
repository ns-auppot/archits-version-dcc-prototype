import { useState } from "react";
import { Search, ArrowUpDown, Filter } from "lucide-react";

export function SearchFilterBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Risk");
  const [filterValue, setFilterValue] = useState("All");

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-nav-bg border-b border-border shrink-0">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search files, data stores, and identities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
            Sort by:
          </span>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border border-border rounded-md text-text-bright hover:bg-nav-active/50 transition-colors"
            style={{ fontSize: "13px" }}
          >
            <span>{sortBy}</span>
            <ArrowUpDown size={13} className="text-muted-foreground" />
          </button>
        </div>

        {/* Filter */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border border-border rounded-md text-text-bright hover:bg-nav-active/50 transition-colors"
          style={{ fontSize: "13px" }}
        >
          <span>Sanctioned: {filterValue}</span>
          <Filter size={13} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
