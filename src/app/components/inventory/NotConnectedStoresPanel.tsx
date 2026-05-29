import { useState } from "react";
import { Database } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { SortDropdown, TableSearchInput, type SortConfig } from "./data-store-shared";
import { UnconnectedDataStoreTable, UnconnectedDataStore } from "../../../imports/UnconnectedDataStoreTable";

// ─── Mock data — 3 not-connected stores ────────────────────────────────────
const NOT_CONNECTED_STORES: UnconnectedDataStore[] = [
  {
    id: 1,
    name: "s3-archive-prod",
    platform: "AWS",
    account: "prod-account-123456",
    firstFound: "Jan 12, 2026",
    region: "us-east-1",
    endpoint: "s3://s3-archive-prod.s3.amazonaws.com",
    status: "Discovered",
  },
  {
    id: 2,
    name: "postgres-legacy-db",
    platform: "Azure",
    account: "legacy-azure-tenant",
    firstFound: "Feb 03, 2026",
    region: "eastus",
    endpoint: "postgres-legacy-db.database.windows.net:5432",
    status: "Discovered",
  },
  {
    id: 3,
    name: "gcs-backup-us-east",
    platform: "GCP",
    account: "my-gcp-project-789",
    firstFound: "Mar 18, 2026",
    region: "us-east1",
    endpoint: "gs://gcs-backup-us-east.storage.googleapis.com",
    status: "Discovered",
  },
];

interface NotConnectedStoresPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotConnectedStoresPanel({ open, onClose }: NotConnectedStoresPanelProps) {
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const SORT_COLUMNS = [
    { key: 'Service Name', label: 'Service Name' },
    { key: 'Platform',     label: 'Platform' },
    { key: 'Account',      label: 'Account' },
    { key: 'First Found',  label: 'First Found' },
    { key: 'Region',       label: 'Region' },
    { key: 'Status',       label: 'Status' },
  ];

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Not Connected Data Store"
      subtitle={`${NOT_CONNECTED_STORES.length} data stores pending connection`}
      titleIcon={<Database size={14} className="text-muted-foreground" />}
      width={860}
      headerActions={
        <>
          <SortDropdown
            columns={SORT_COLUMNS}
            sortConfig={sortConfig}
            onSort={setSortConfig}
          />
          <TableSearchInput
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setPage(1); }}
          />
        </>
      }
    >
      <div className="flex flex-col h-full">
        <UnconnectedDataStoreTable
          data={NOT_CONNECTED_STORES}
          currentPage={page}
          rowsPerPage={5}
          onPageChange={setPage}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          searchTerm={searchTerm}
          onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
          onActionClick={(store) => console.log("Action:", store)}
          onServiceNameClick={(store) => console.log("Name click:", store)}
        />
      </div>
    </SidePanel>
  );
}