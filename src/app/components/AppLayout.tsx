import { Outlet } from "react-router";
import { LeftNav } from "./LeftNav";
import { SidebarProvider, useSidebar } from "./ui/sidebar";

function ContentArea() {
  const { setOpen } = useSidebar();

  return (
    <div
      className="flex flex-col flex-1 min-w-0 overflow-hidden"
      onClick={() => setOpen(false)}
    >
      <Outlet />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "200px", "--sidebar-width-icon": "48px" } as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <LeftNav />
        <ContentArea />
      </div>
    </SidebarProvider>
  );
}
