import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Library,
  Server,
  Settings,
} from "lucide-react";
import { NavLink, useLocation, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listBooks } from "@/lib/books-api";
import { queryKeys } from "@/lib/query/query-keys";
import {
  bookDashboardPath,
  bookReaderPath,
  bookResourcesPath,
  parseBookId,
  settingsPath,
} from "@/lib/routes";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";
const appIconUrl = `${import.meta.env.BASE_URL}app-icon.png`;

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const params = useParams();
  const location = useLocation();
  const currentBookId = parseBookId(params.bookId);

  const booksQuery = useQuery({
    queryKey: queryKeys.books(),
    queryFn: () => listBooks(),
    staleTime: 30_000,
  });

  const currentBook = booksQuery.data?.find((b) => b.id === currentBookId);

  const isBookDashboardRoute =
    currentBookId !== null &&
    (location.pathname === bookDashboardPath(currentBookId) ||
      location.pathname.startsWith(`${bookDashboardPath(currentBookId)}/chapters/`));

  const generalNav = [
    { label: "书库", to: "/app", icon: Library, end: true },
    { label: "设置", to: settingsPath(), icon: Settings },
    ...(isTauri ? [{ label: "服务端", to: "/app/server", icon: Server }] : []),
  ];

  const bookNav = currentBookId
    ? [
        {
          label: "总览",
          to: bookDashboardPath(currentBookId),
          icon: LayoutDashboard,
          isActive: isBookDashboardRoute,
        },
        {
          label: "资源",
          to: bookResourcesPath(currentBookId),
          icon: FolderKanban,
        },
        {
          label: "阅读",
          to: bookReaderPath(currentBookId),
          icon: BookOpenText,
        },
      ]
    : [];

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out-expo",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-12 items-center gap-2 px-3", collapsed && "justify-center")}>
        <img src={appIconUrl} alt="AI 小说工作台" className="h-8 w-8 shrink-0 rounded-lg" />
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground">AI 小说工作台</span>
        )}
      </div>

      <Separator />

      {/* General navigation */}
      <nav className="flex flex-col gap-1 px-2 py-2">
        {generalNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center border-l-0",
                  isActive
                    ? "border-l-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <Separator />

      {/* Book context section */}
      <div className="flex flex-1 flex-col overflow-hidden px-2 py-2">
        {!collapsed && (
          <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
            当前书籍
          </div>
        )}

        {currentBookId && currentBook ? (
          <>
            {!collapsed && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-sidebar-accent/50 px-2 py-1.5">
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {currentBook.title}
                </span>
              </div>
            )}

            <nav className="flex flex-col gap-1">
              {bookNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.label === "总览"}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center border-l-0",
                        (item.isActive !== undefined ? item.isActive : isActive)
                          ? "border-l-primary bg-primary/10 text-primary shadow-glow-sm"
                          : "border-l-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </>
        ) : (
          !collapsed && (
            <div className="rounded-lg border border-dashed border-border bg-gradient-subtle px-3 py-3 text-xs text-muted-foreground">
              从书库选择一本书开始创作
            </div>
          )
        )}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <Button
          variant="ghost"
          onClick={onToggle}
          className="flex w-full items-center justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          aria-label={collapsed ? "展开导航栏" : "折叠导航栏"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">折叠侧栏</span>}
        </Button>
      </div>
    </aside>
  );
}
