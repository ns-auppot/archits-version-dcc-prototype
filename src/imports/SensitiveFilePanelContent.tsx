import { SensitiveFileDetailPane } from "./ForensicDetailPane";
import type { SearchableItem } from "./inventory-search-data";

export function SensitiveFilePanelContent({ item }: { item: SearchableItem }) {
  const dataTypes = item.dataTypesArray ?? [];
  return (
    <SensitiveFileDetailPane
      name={item.name}
      path={item.subtitle ?? ""}
      store={item.details["Store"] ?? ""}
      storeSource={item.source}
      size={item.details["Size"] ?? ""}
      lastModified={item.details["Last Modified"] ?? ""}
      dataTypes={dataTypes}
    />
  );
}
