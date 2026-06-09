import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { AppHeader } from "@/app/layouts/AppHeader";
import { AppSidebar } from "@/app/layouts/AppSidebar";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export function AppShell() {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendChecked, setBackendChecked] = useState(!isTauri);
  const [backendHealthy, setBackendHealthy] = useState(!isTauri);

  useEffect(() => {
    if (!isTauri) return;
    const baseUrl = localStorage.getItem("api-base-url");
    if (baseUrl === null) {
      setBackendChecked(true);
      return;
    }
    if (baseUrl === "") {
      setBackendHealthy(true);
      setBackendChecked(true);
      return;
    }
    const w = window as { __TAURI__?: { core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } } };
    w.__TAURI__!.core.invoke("check_health", { url: baseUrl })
      .then((healthy) => {
        if (healthy) setBackendHealthy(true);
        setBackendChecked(true);
      })
      .catch(() => {
        setBackendChecked(true);
      });
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isAuthRoute = location.pathname === "/app/login" || location.pathname === "/app/register";
  const isConnectRoute = location.pathname === "/app/connect";

  if (isConnectRoute) {
    return <Outlet />;
  }

  if (!backendChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在检查后端连接...
      </div>
    );
  }

  if (isTauri && !backendHealthy) {
    return <Navigate to="/app/connect" replace />;
  }

  if (isAuthRoute || isLoading || !isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            role="presentation"
          />
          <div className="relative z-50 h-full w-56">
            <AppSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
