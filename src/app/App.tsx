import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { EmptyPage } from "./components/EmptyPage";
import { DisabledRulesProvider } from "./shared/disabled-rules-store";

import { OverviewSection } from "./components/overview/OverviewSection";
import { InventoryPage } from "./components/inventory/InventoryPage";
import { InventorySearchResults } from "./components/inventory/InventorySearchResults";
import { DataExplorerPage } from "./components/inventory/DataExplorerPage";
import { RiskPage } from "./components/risk/RiskPage";
import { DisabledPoliciesPage } from "./components/risk/DisabledPoliciesPage";
import { PoliciesPage } from "./components/risk/PoliciesPage";
import { RiskStagesPage } from "./components/risk/RiskStagesPage";
import { RiskDashboardKanban } from "./components/risk/RiskDashboardKanban";
import { TopologiesDictionaryPage } from "./components/risk/TopologiesDictionaryPage";
import { TopologyDesignSystemPage } from "./components/risk/TopologyDesignSystemPage";
import { OnboardingApp } from "./components/onboarding/OnboardingApp";

function ProtectionPage() {
  return <EmptyPage title="Protection" />;
}

function RedirectToOverview() {
  return <Navigate to="/overview" replace />;
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  const [router] = useState(() => createBrowserRouter([
    {
      path: "/",
      Component: AppLayout,
      children: [
        { index: true, Component: RedirectToOverview },
        { path: "overview", Component: OverviewSection },
        { path: "inventory", Component: InventoryPage },
        { path: "inventory/search", Component: InventorySearchResults },
        { path: "inventory/data-explorer", Component: DataExplorerPage },
        { path: "risk", Component: RiskPage },
        { path: "risk/disabled-policies", Component: DisabledPoliciesPage },
        { path: "risk/policies", Component: PoliciesPage },
        { path: "risk/stages", Component: RiskStagesPage },
        { path: "risk/dashboard", Component: RiskDashboardKanban },
        { path: "risk/topologies", Component: TopologiesDictionaryPage },
        { path: "risk/topologies/design", Component: TopologyDesignSystemPage },
        { path: "protection", Component: ProtectionPage },
        { path: "setup", Component: OnboardingApp },
      ],
    },
  ], { basename }));

  return (
    <DisabledRulesProvider>
      <RouterProvider router={router} />
    </DisabledRulesProvider>
  );
}
