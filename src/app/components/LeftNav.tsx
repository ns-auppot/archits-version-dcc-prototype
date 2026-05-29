import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import {
  ArrowLeft, Gauge, List, TrafficCone, Settings2,
  ChevronRight, ChevronDown, MoreVertical, Sun, Moon,
  ChevronsLeft, ChevronsRight,
  Home, Sparkles, ShieldCheck, Database, TriangleAlert,
  Server, FileText, Cloud, BarChart2, Monitor, Globe,
  Smartphone, Settings, FileBarChart, Lock, Rocket,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  useSidebar,
} from "./ui/sidebar";

const configItems = [
  { label: "Setup Summary",     path: "/setup" },
  { label: "Discovery Profile", path: "/setup?page=discovery-profile" },
  { label: "Scanners",          path: "/setup?page=scanners" },
  { label: "Infrastructure",    path: "/setup?page=csp" },
  { label: "Data Stores",       path: "/setup?page=data-store" },
  { label: "Scan Activity",     path: "/setup?page=scan" },
];

const platformNavItems = [
  { label: "Home",                                    Icon: Home,        hasArrow: false },
  { label: "AISecOps",                                Icon: Sparkles,    hasArrow: false },
  { label: "AI Security",                             Icon: ShieldCheck, hasArrow: false },
  { label: "Data Security",                           Icon: Database,    hasArrow: false, isDataSec: true },
  { label: "Incidents",                               Icon: TriangleAlert, hasArrow: true },
  { label: "API-enabled Protection",                  Icon: Server,      hasArrow: true },
  { label: "Policies",                                Icon: FileText,    hasArrow: true },
  { label: "SkopeIT™",                               Icon: Database,    hasArrow: true },
  { label: "App Catalog (CCI)",                       Icon: Cloud,       hasArrow: true },
  { label: "Advanced Analytics (AA)",                 Icon: BarChart2,   hasArrow: true, subLabel: "(Trial: Unlimited)" },
  { label: "Digital Experience Management (DEM)",     Icon: Monitor,     hasArrow: true },
  { label: "Data Security Posture Management (DSPM)", Icon: Lock,        hasArrow: true },
  { label: "Reports",                                 Icon: FileBarChart,hasArrow: true },
  { label: "Borderless SD-WAN",                       Icon: Globe,       hasArrow: true },
  { label: "Device Intelligence",                     Icon: Smartphone,  hasArrow: true },
];

function CollapseToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
    >
      {open ? <ChevronsLeft size={15} /> : <ChevronsRight size={15} />}
    </button>
  );
}

export function LeftNav() {
  const location = useLocation();
  const nav = useNavigate();
  const [navMode, setNavMode] = useState<"datasec" | "platform">("datasec");
  const [configOpen, setConfigOpen] = useState(() => location.pathname.startsWith("/setup"));
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const isConfigActive = location.pathname.startsWith("/setup");

  const logoAndToggle = (
    <div className="flex items-center justify-between px-1 mb-2">
      <img src={`${import.meta.env.BASE_URL}netskope-logo.png`} alt="Netskope" className="h-7 w-auto group-data-[collapsible=icon]:h-6" />
      <div className="group-data-[collapsible=icon]:hidden">
        <CollapseToggle />
      </div>
    </div>
  );

  const footer = (
    <SidebarFooter className="px-2 py-2">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
        <div className="w-7 h-7 rounded-full bg-blue-300 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-gray-800">AU</span>
        </div>
        <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
          <div className="text-[13px] font-semibold text-sidebar-foreground truncate">Archit Uppot</div>
          <div className="text-[11px] text-sidebar-foreground/50 truncate">auppot@netskope.com</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 group-data-[collapsible=icon]:hidden">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-1 rounded hover:bg-sidebar-accent/60 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button className="p-1 rounded hover:bg-sidebar-accent/60 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <MoreVertical size={13} />
          </button>
        </div>
      </div>
    </SidebarFooter>
  );

  if (navMode === "platform") {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-2 pt-3 pb-2">
          {logoAndToggle}
          <div className="hidden group-data-[collapsible=icon]:flex justify-center mb-1">
            <CollapseToggle />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-2 py-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {platformNavItems.map(({ label, Icon, hasArrow, subLabel, isDataSec }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      tooltip={label}
                      onClick={isDataSec ? () => setNavMode("datasec") : undefined}
                      className={`h-auto px-2 gap-2 rounded-md w-full flex items-center text-[13px] cursor-pointer transition-colors ${
                        isDataSec
                          ? "text-sidebar-foreground hover:bg-sidebar-accent font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                        {label}
                        {subLabel && (
                          <span className="block text-[11px] text-sidebar-foreground/50">{subLabel}</span>
                        )}
                      </span>
                      {hasArrow && (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* Settings */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Settings"
                    className="h-auto px-2 gap-2 rounded-md w-full flex items-center text-[13px] cursor-pointer transition-colors text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {footer}
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 pt-3 pb-2">
        {logoAndToggle}

        <div className="hidden group-data-[collapsible=icon]:flex justify-center mb-1">
          <CollapseToggle />
        </div>

        {/* DataSec Command Center title — click to go back to platform nav */}
        <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
          <SidebarMenuButton
            onClick={() => setNavMode("platform")}
            className="h-auto px-2 gap-2 hover:bg-sidebar-accent rounded-md overflow-visible [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-sidebar-foreground" />
            <span className="text-[16px] font-bold leading-7 text-sidebar-foreground">
              DataSec Command Center
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">

              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Overview"
                  isActive={location.pathname.startsWith("/overview")}
                >
                  <NavLink to="/overview">
                    <Gauge className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Overview</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Inventory */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Inventory"
                  isActive={location.pathname.startsWith("/inventory")}
                >
                  <NavLink to="/inventory">
                    <List className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Inventory</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Risk */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Risk"
                  isActive={location.pathname.startsWith("/risk")}
                >
                  <NavLink to="/risk">
                    <TrafficCone className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Risk</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Configuration */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Configuration"
                  onClick={() => {
                    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                    const isCollapsed = sidebar?.getAttribute('data-collapsible') === 'icon' && sidebar?.getAttribute('data-state') === 'collapsed';
                    if (isCollapsed) {
                      nav('/setup');
                    } else {
                      setConfigOpen(v => !v);
                    }
                  }}
                  className={`h-8 px-2 gap-2 rounded-md w-full flex items-center text-[13px] cursor-pointer transition-colors ${
                    isConfigActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Settings2 className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Configuration</span>
                  {configOpen
                    ? <ChevronDown className="w-3.5 h-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                    : <ChevronRight className="w-3.5 h-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                  }
                </SidebarMenuButton>

                {configOpen && (
                  <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                    {configItems.map(({ label, path }) => {
                      const isActive = path === "/setup"
                        ? location.pathname === "/setup" && !location.search
                        : location.pathname + location.search === path;
                      return (
                        <SidebarMenuSubItem key={path}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={path}
                              className={`text-[13px] transition-colors ${
                                isActive
                                  ? "text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                              }`}
                            >
                              {label}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {footer}
    </Sidebar>
  );
}
