import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { InventoryNav } from "./InventoryNav";
import { InventoryContent } from "./InventoryContent";
import { InventorySearchBar } from "./InventorySearchBar";

export function InventoryPage() {
  const [searchParams] = useSearchParams();
  const navFromUrl = searchParams.get("nav");

  const [selectedNavId, setSelectedNavId] = useState(
    navFromUrl || "unmanaged-application",
  );

  // Sync nav selection when arriving from search results deep-link
  useEffect(() => {
    if (navFromUrl) setSelectedNavId(navFromUrl);
  }, [navFromUrl]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Inventory-wide natural language search bar (only renders on search results page) */}
      <InventorySearchBar />

      {/* Main Content: Left Nav + Right Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Navigation Tree */}
        <InventoryNav selectedId={selectedNavId} onSelect={setSelectedNavId} />

        {/* Right: Table or Dashboard */}
        <InventoryContent selectedNavId={selectedNavId} />
      </div>
    </div>
  );
}
