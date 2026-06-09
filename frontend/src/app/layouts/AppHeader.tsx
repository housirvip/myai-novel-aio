import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBook } from "@/lib/books-api";
import { getChapter } from "@/lib/chapters-api";
import { queryKeys } from "@/lib/query/query-keys";
import { parseBookId, parseChapterNo } from "@/lib/routes";

type AppHeaderProps = {
  onMenuClick: () => void;
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const navigate = useNavigate();
  const params = useParams();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const bookId = parseBookId(params.bookId);
  const chapterNo = parseChapterNo(params.chapterNo);

  const bookQuery = useQuery({
    queryKey: queryKeys.book(bookId ?? 0),
    queryFn: () => getBook(bookId!),
    enabled: bookId !== null,
    staleTime: 30_000,
  });

  const chapterQuery = useQuery({
    queryKey: queryKeys.chapter(bookId ?? 0, chapterNo ?? 0),
    queryFn: () => getChapter(bookId!, chapterNo!),
    enabled: bookId !== null && chapterNo !== null,
    staleTime: 30_000,
  });

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="打开菜单"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumb */}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm" aria-label="面包屑">
        <span className="shrink-0 text-muted-foreground">AI 小说工作台</span>
        {bookQuery.data && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-foreground">{bookQuery.data.title}</span>
          </>
        )}
        {chapterQuery.data && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-foreground">
              第{chapterQuery.data.chapterNo}章
              {chapterQuery.data.title ? ` · ${chapterQuery.data.title}` : ""}
            </span>
          </>
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="切换主题">
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="用户菜单">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {userInitial}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="truncate font-medium">{user.displayName}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  navigate("/app/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
