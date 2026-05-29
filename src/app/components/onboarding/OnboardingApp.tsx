import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate as useRouterNavigate } from "react-router";
import { Sparkles, ArrowRight, CheckCircle, Gauge } from "lucide-react";
import { SETUP_STEPS, DLP_PROFILES, PLACEHOLDER_COPY } from "./wizard-data";
import type { StepStatus, ConnectedStore } from "./types";
import { SetupBanner } from "./SetupBanner";
import { SetupGuide } from "./SetupGuide";
import { DiscoveryProfilePage } from "./DiscoveryProfilePage";
import { OnboardingDashboard } from "./OnboardingDashboard";
import { PlaceholderPage } from "./PlaceholderPage";
import { ScannerAdminPage } from "./ScannerAdminPage";
import { CloudInfraPage } from "./CloudInfraPage";
import { DataStorePage } from "./DataStorePage";
import { ScanActivityPage } from "./ScanActivityPage";

export function OnboardingApp() {
  const routerNavigate = useRouterNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get("page");

  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [tourActive, setTourActive] = useState(false);
  const [forceEmptyState, setForceEmptyState] = useState(false);
  const [route, setRouteRaw] = useState(() => pageParam || "setup-guide");

  const setRoute = useCallback((r: string) => {
    setRouteRaw(r);
    if (r === "setup-guide") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ page: r }, { replace: true });
    }
  }, [setSearchParams]);

  useEffect(() => {
    const target = pageParam || "setup-guide";
    if (target !== route) {
      setRouteRaw(target);
      const step = SETUP_STEPS.find((s) => s.route === target);
      if (step) {
        setActiveStepId(step.id);
        setStatuses((prev) => (prev[step.id] === "done" ? prev : { ...prev, [step.id]: "active" }));
      }
    }
  }, [pageParam]);

  const initStatuses = (): Record<string, StepStatus> => {
    const map: Record<string, StepStatus> = {};
    SETUP_STEPS.forEach((s, i) => { map[s.id] = i === 0 ? "active" : "todo"; });
    return map;
  };
  const [statuses, setStatuses] = useState(initStatuses);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [activeStepId, setActiveStepId] = useState(SETUP_STEPS[0].id);

  const requiredIds = useMemo(() => DLP_PROFILES.filter((p) => p.defaultOn).map((p) => p.id), []);
  const [dpSelected, setDpSelected] = useState(requiredIds);
  const [dpSaved, setDpSaved] = useState<string[] | null>(null);

  const isSetupActive = !setupDismissed && Object.values(statuses).some((s) => s !== "done" && s !== "skipped");
  const allDone = Object.values(statuses).every((s) => s === "done" || s === "skipped");

  function handleStoreConnected(data: { service?: string; account: string; endpoint: string; provider?: string; region?: string }) {
    const id = "sa-new-" + Date.now();
    const newRow: ConnectedStore = {
      id,
      service: data.service || "Service",
      account: data.account,
      endpoint: data.endpoint,
      provider: data.provider || "aws",
      region: data.region || "us-west-2",
      scanState: "queued",
      scanType: "smart",
      progress: 0,
      filesScanned: 0,
      filesTotal: 0,
      sizeScanned: "—",
      sizeTotal: "—",
      lastScan: "just now",
      nextScan: "now",
      justConnected: true,
      findings: { critical: 0, high: 0, medium: 0, low: 0 },
      history: [{ ts: "just now", type: "info", msg: "Connection saved · scan queued" }],
    };
    setConnectedStores((prev) => [newRow, ...prev]);
    setTimeout(() => {
      setConnectedStores((prev) => prev.map((s) => (s.id === id ? { ...s, scanState: "running", progress: 3 } : s)));
    }, 1200);
    setStatuses((prev) => (prev["data-store"] === "done" ? prev : { ...prev, "data-store": "done", scan: "active" }));
    setActiveStepId("scan");
    setRoute("scan");
  }

  function navigate(r: string) {
    if (r === "overview-tour") {
      markStepDone("overview");
      routerNavigate("/overview?tour=1");
      return;
    }
    setRoute(r);
    const step = SETUP_STEPS.find((s) => s.route === r);
    if (step) {
      setActiveStepId(step.id);
      setStatuses((prev) => (prev[step.id] === "done" ? prev : { ...prev, [step.id]: "active" }));
    }
  }

  function backToHub() {
    setRoute("setup-guide");
  }

  function markStepDone(stepId: string) {
    setStatuses((prev) => ({ ...prev, [stepId]: "done" }));
    const idx = SETUP_STEPS.findIndex((s) => s.id === stepId);
    const next = SETUP_STEPS[idx + 1];
    if (next) setActiveStepId(next.id);
  }

  function skipStep(stepId: string) {
    setStatuses((prev) => ({ ...prev, [stepId]: "skipped" }));
    const idx = SETUP_STEPS.findIndex((s) => s.id === stepId);
    const next = SETUP_STEPS[idx + 1];
    if (next) {
      setActiveStepId(next.id);
      setRoute(next.route);
    } else {
      setRoute("setup-guide");
    }
  }

  function continueToNext(currentStepId: string) {
    const idx = SETUP_STEPS.findIndex((s) => s.id === currentStepId);
    const next = SETUP_STEPS[idx + 1];
    if (next) {
      navigate(next.route);
    } else {
      setRoute("setup-guide");
    }
  }

  function saveDiscoveryProfile(selectedIds: string[]) {
    setDpSaved(selectedIds);
    markStepDone("discovery-profile");
  }

  const currentStepOnScreen = SETUP_STEPS.find((s) => s.route === route);
  const showBanner = isSetupActive && !!currentStepOnScreen && route !== "setup-guide";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showBanner && currentStepOnScreen && (
        <SetupBanner
          steps={SETUP_STEPS}
          currentStepId={currentStepOnScreen.id}
          statuses={statuses}
          onBackToHub={backToHub}
          onContinue={() => continueToNext(currentStepOnScreen.id)}
          onSkip={currentStepOnScreen.optional ? () => skipStep(currentStepOnScreen.id) : null}
          dismissed={false}
          onDismiss={() => setSetupDismissed(true)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {route === "setup-guide" && (
          <SetupGuide
            steps={SETUP_STEPS}
            statuses={statuses}
            activeStepId={activeStepId}
            layout="timeline"
            allDone={allDone}
            onStepClick={(s) => setActiveStepId(s.id)}
            onResume={(s) => navigate(s.route)}
            onSkipAll={() => setSetupDismissed(true)}
            onGoToOverview={() => setRoute("overview")}
          />
        )}

        {/* Overview is now on the main /overview route — not here */}

        {route === "discovery-profile" && (
          <DiscoveryProfilePage
            selectedIds={dpSelected}
            onSelectedChange={setDpSelected}
            savedSnapshot={dpSaved}
            onSave={saveDiscoveryProfile}
            setupActive={isSetupActive}
            onBackToHub={backToHub}
          />
        )}

        {route === "scanners" && (
          <ScannerAdminPage
            setupActive={isSetupActive}
            status={statuses.scanners}
            onBackToHub={backToHub}
            onSkipStep={() => skipStep("scanners")}
            onSaveStep={(done: boolean) => {
              if (done) markStepDone("scanners");
              else setStatuses((prev) => ({ ...prev, scanners: "active" }));
            }}
          />
        )}

        {route === "csp" && (
          <CloudInfraPage
            setupActive={isSetupActive}
            status={statuses.csp}
            onBackToHub={backToHub}
            onSkipStep={() => skipStep("csp")}
            onSaveStep={(done: boolean) => {
              if (done) markStepDone("csp");
              else setStatuses((prev) => ({ ...prev, csp: "active" }));
            }}
          />
        )}

        {route === "data-store" && (
          <DataStorePage
            setupActive={isSetupActive}
            status={statuses["data-store"]}
            onBackToHub={backToHub}
            onConnected={handleStoreConnected}
            onSaveStep={(done: boolean) => {
              if (done) markStepDone("data-store");
              else setStatuses((prev) => ({ ...prev, "data-store": "active" }));
            }}
          />
        )}

        {route === "scan" && (
          <ScanActivityPage
            setupActive={isSetupActive}
            status={statuses.scan}
            onBackToHub={backToHub}
            connectedStores={connectedStores as any}
            onArchive={(store: any) => setConnectedStores((prev) => prev.filter((s) => s.id !== store.id))}
            onViewInventory={() => setRoute("inventory")}
            onSaveStep={(done: boolean) => {
              if (done) markStepDone("scan");
              else setStatuses((prev) => ({ ...prev, scan: "active" }));
            }}
          />
        )}

        {/* overview-tour now redirects to /overview via routerNavigate */}

        {["inventory", "risk"].includes(route) && (
          <div className="p-6">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {route === "inventory" ? "Inventory" : "Risk"}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
              This area is part of DCC but not in scope for this iteration.
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-12 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              Placeholder
            </div>
          </div>
        )}
      </div>

      {/* Floating resume pill */}
      {isSetupActive && route !== "setup-guide" && route !== "overview" && !showBanner && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500 text-white text-[13px] font-medium shadow-lg cursor-pointer hover:bg-blue-600 transition-colors z-40"
          onClick={backToHub}
        >
          <Sparkles size={13} />
          Resume Setup Guide
        </div>
      )}
    </div>
  );
}

function OverviewLanding({ setupActive, onOpenSetupGuide, forceEmpty, onExitEmptyState }: { setupActive: boolean; onOpenSetupGuide: () => void; forceEmpty?: boolean; onExitEmptyState?: () => void }) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Overview</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
            Data security posture and risk graph for your estate.
          </p>
        </div>
        <div className="flex gap-2">
          {forceEmpty && onExitEmptyState && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-pink-600 bg-pink-50 border-none cursor-pointer hover:bg-pink-100 transition-colors"
              onClick={onExitEmptyState}
            >
              Exit empty state
            </button>
          )}
          {setupActive && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 bg-transparent cursor-pointer transition-colors dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={onOpenSetupGuide}
            >
              <Sparkles size={13} /> Open Setup Guide
            </button>
          )}
        </div>
      </div>

      {setupActive && (
        <div
          className="rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50/40 to-transparent p-5 cursor-pointer dark:border-blue-800/40 dark:from-blue-950/20"
          onClick={onOpenSetupGuide}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-900/30">
              <Sparkles size={20} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Finish setting up DCC</div>
              <div className="text-[15px] font-semibold text-slate-800 mt-0.5 dark:text-slate-200">
                Your Overview will populate once your first scans run
              </div>
              <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">
                Complete the prerequisites in Configuration → Setup Guide. Most teams finish in under 20 minutes.
              </div>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
              onClick={(e) => { e.stopPropagation(); onOpenSetupGuide(); }}
            >
              Open Setup Guide <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          {!setupActive
            ? <CheckCircle size={28} className="text-green-500" />
            : <Gauge size={28} className="text-slate-400" />}
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1.5 dark:text-slate-200">
          {!setupActive ? "Setup complete — first scans queued" : "Awaiting first scan"}
        </h2>
        <p className="text-[13px] text-slate-500 max-w-md mx-auto dark:text-slate-400">
          {!setupActive
            ? "Critical Risks, Sensitive Data Types and identity coverage panels will appear here as scans complete."
            : "Finish setup to start discovering and classifying sensitive data across your estate. The Overview dashboard will populate as your first scan progresses."}
        </p>
      </div>
    </div>
  );
}
