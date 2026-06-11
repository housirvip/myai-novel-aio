import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ChevronLeft, ChevronRight, Maximize2, Minimize2, Moon, Sun, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useTheme } from "@/components/theme-provider";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatApiErrorMessage } from "@/lib/api";
import { getBook } from "@/lib/books-api";
import { getChapterStage, listChapters } from "@/lib/chapters-api";
import { queryKeys } from "@/lib/query/query-keys";
import { chapterWorkbenchPath, parseBookId } from "@/lib/routes";

const desktopReaderWidthQuery = "(min-width: 1024px)";

function getDefaultWideMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(desktopReaderWidthQuery).matches;
}

export function ChapterReaderPage() {
  const params = useParams();
  const bookId = parseBookId(params.bookId);
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [fontScale, setFontScale] = useState(18);
  const [wideMode, setWideMode] = useState(getDefaultWideMode);
  const wideModeManuallyChangedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(desktopReaderWidthQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      if (!wideModeManuallyChangedRef.current) {
        setWideMode(event.matches);
      }
    };

    setWideMode(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const bookQuery = useQuery({
    queryKey: queryKeys.book(bookId ?? "invalid"),
    queryFn: () => getBook(bookId!),
    enabled: bookId !== null,
  });

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chapters(bookId ?? "invalid"),
    queryFn: () => listChapters(bookId!),
    enabled: bookId !== null,
  });

  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((left, right) => left.chapterNo - right.chapterNo),
    [chaptersQuery.data],
  );

  const firstReadableChapterNo = useMemo(
    () => chapters.find((chapter) => chapter.currentFinalId)?.chapterNo ?? chapters[0]?.chapterNo ?? null,
    [chapters],
  );

  const finalChapterNos = useMemo(
    () => chapters.filter((chapter) => chapter.currentFinalId).map((chapter) => chapter.chapterNo),
    [chapters],
  );

  useEffect(() => {
    if (chapters.length === 0) {
      if (selectedChapterNo !== null) {
        setSelectedChapterNo(null);
      }
      return;
    }

    const hasSelectedChapter = selectedChapterNo !== null && chapters.some((chapter) => chapter.chapterNo === selectedChapterNo);
    if (hasSelectedChapter) {
      return;
    }

    setSelectedChapterNo(firstReadableChapterNo);
  }, [chapters, firstReadableChapterNo, selectedChapterNo]);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.chapterNo === selectedChapterNo) ?? null,
    [chapters, selectedChapterNo],
  );

  const activeChapterIndex = useMemo(
    () => chapters.findIndex((chapter) => chapter.chapterNo === selectedChapterNo),
    [chapters, selectedChapterNo],
  );

  const previousChapter = activeChapterIndex > 0 ? chapters[activeChapterIndex - 1] : null;
  const nextChapter = activeChapterIndex >= 0 ? chapters[activeChapterIndex + 1] ?? null : null;
  const readableChapterCount = finalChapterNos.length;
  const progressPercent = chapters.length > 0 ? Math.round((readableChapterCount / chapters.length) * 100) : 0;
  const activePosition = activeChapterIndex >= 0 ? activeChapterIndex + 1 : 0;
  const readerWidthClass = wideMode ? "max-w-[920px]" : "max-w-[720px]";

  const finalQuery = useQuery({
    queryKey: queryKeys.chapterStage(bookId ?? "invalid", selectedChapterNo ?? "none", "final"),
    queryFn: () => getChapterStage(bookId!, selectedChapterNo!, "final"),
    enabled: bookId !== null && selectedChapterNo !== null && Boolean(activeChapter?.currentFinalId),
  });

  const selectionHint =
    finalChapterNos.length > 0
      ? `默认优先选中第一个已有 final 的章节，当前共有 ${finalChapterNos.length} 章可直接阅读。`
      : "当前还没有 final 成稿，目录会从第一章开始显示，方便你定位待补齐章节。";

  if (bookId === null) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
        URL 中的书籍编号无效，请回到书籍总览重新进入。
      </section>
    );
  }

  return (
    <section className="relative grid min-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border/70 bg-gradient-subtle shadow-elevation-2 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.10),transparent_28rem)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.12),hsl(var(--background)/0)_24rem)]" />

      <aside className="relative border-b border-border/70 bg-card/80 backdrop-blur xl:border-b-0 xl:border-r xl:border-border/70">
        <Card className="flex h-full flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none xl:sticky xl:top-4 xl:h-[calc(100vh-8rem)]">
          <div className="px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Reader</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">章节目录</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{bookQuery.data?.title ?? "小说阅读器"}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs">
                {readableChapterCount} / {chapters.length}
              </Badge>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>阅读进度</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out-expo"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-xs leading-6 text-muted-foreground">
              {selectionHint}
            </div>
          </div>

          <nav aria-label="章节目录" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4 text-sm">
            {chaptersQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-[60px] rounded-2xl" />
                <Skeleton className="h-[60px] rounded-2xl" />
                <Skeleton className="h-[60px] rounded-2xl" />
                <Skeleton className="h-[60px] rounded-2xl" />
                <Skeleton className="h-[60px] rounded-2xl" />
              </div>
            )}
            {!chaptersQuery.isLoading && chapters.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-muted-foreground">
                当前书籍还没有章节。
              </div>
            )}
            {chapters.map((chapter) => {
              const selected = chapter.chapterNo === selectedChapterNo;
              return (
                <Button
                  key={chapter.id}
                  variant="ghost"
                  onClick={() => setSelectedChapterNo(chapter.chapterNo)}
                  aria-current={selected ? "page" : undefined}
                  aria-label={`选择第 ${chapter.chapterNo} 章：${chapter.title || "未命名章节"}，${chapter.currentFinalId ? "已有成稿" : "待完成"}`}
                  className={cn(
                    "h-auto min-h-[60px] w-full cursor-pointer flex-col items-stretch justify-start whitespace-normal rounded-2xl px-3 py-3 text-left transition-all duration-200",
                    selected
                      ? "border border-primary/30 bg-primary/10 text-foreground shadow-glow-sm hover:bg-primary/15"
                      : "border border-transparent bg-background/70 text-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-medium">第 {chapter.chapterNo} 章</span>
                    <div className="flex items-center gap-2">
                      {selected && <Badge variant="secondary" className="bg-primary/15 text-primary">当前</Badge>}
                      <Badge variant={chapter.currentFinalId ? "success" : "warning"}>
                        {chapter.currentFinalId ? "成稿" : "待完成"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {chapter.title || "未命名章节"}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground/60">
                    状态：{chapter.status}
                  </div>
                </Button>
              );
            })}
          </nav>
        </Card>
      </aside>

      <article aria-label="小说正文" className="relative min-w-0 px-3 py-4 sm:px-6 lg:px-8">
        <div className={cn("mx-auto flex min-h-full w-full flex-col transition-[max-width] duration-200 ease-out-expo", readerWidthClass)}>
          <div className="sticky top-4 z-10 rounded-[1.75rem] border border-border/70 bg-card/90 px-4 py-4 shadow-elevation-2 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                  <BookOpenText className="h-4 w-4" />
                  成稿阅读
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                  {activeChapter?.title || bookQuery.data?.title || "章节成稿阅读"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bookQuery.data?.title ? `${bookQuery.data.title} · ` : ""}第 {selectedChapterNo ?? "—"} 章 · {activePosition} / {chapters.length || "—"}
                </p>
                {activeChapter && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">
                      {activeChapter.currentFinalId ? "可阅读成稿" : "暂无成稿"}
                    </Badge>
                    <Badge variant="secondary">
                      状态：{activeChapter.status}
                    </Badge>
                  </div>
                )}
              </div>

              <div role="toolbar" aria-label="阅读控制" className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  onClick={() => previousChapter && setSelectedChapterNo(previousChapter.chapterNo)}
                  disabled={!previousChapter}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一章
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  onClick={() => nextChapter && setSelectedChapterNo(nextChapter.chapterNo)}
                  disabled={!nextChapter}
                >
                  下一章
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  aria-label="减小字号"
                  onClick={() => setFontScale((value) => Math.max(16, value - 2))}
                >
                  <Type className="h-4 w-4" />
                  A-
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  aria-label="增大字号"
                  onClick={() => setFontScale((value) => Math.min(28, value + 2))}
                >
                  <Type className="h-4 w-4" />
                  A+
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  aria-label={wideMode ? "切换为常规阅读宽度" : "切换为加宽阅读宽度"}
                  aria-pressed={wideMode}
                  onClick={() => {
                    wideModeManuallyChangedRef.current = true;
                    setWideMode((value) => !value);
                  }}
                >
                  {wideMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {wideMode ? "常规宽度" : "加宽版心"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-3"
                  aria-label={resolvedTheme === "dark" ? "切换为亮色阅读主题" : "切换为暗色阅读主题"}
                  aria-pressed={resolvedTheme === "dark"}
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {resolvedTheme === "dark" ? "亮色" : "暗色"}
                </Button>
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              当前阅读第 {selectedChapterNo ?? "—"} 章，字号 {fontScale}px，{wideMode ? "加宽版心" : "常规版心"}
            </p>
          </div>

          <div className="mt-5 rounded-[2rem] border border-border/70 bg-card/95 px-5 py-8 shadow-elevation-3 sm:px-10 lg:px-16 lg:py-14">
            <div className="text-foreground" style={{ fontSize: `${fontScale}px`, lineHeight: 2.05 }}>
              {chaptersQuery.isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-10/12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-8/12" />
                </div>
              )}
              {!chaptersQuery.isLoading && activeChapter && !activeChapter.currentFinalId && (
                <Card className="rounded-2xl border-dashed bg-background/70 text-sm">
                  <CardContent className="px-5 py-6">
                    <div className="font-medium">这一章还没有 final 成稿。</div>
                    <div className="mt-2 leading-7">
                      阅读页保持只读 final 的边界，不会自动回退到 draft。你可以先去章节工作台完成 approve，再回来继续阅读。
                    </div>
                    {selectedChapterNo !== null && (
                      <Button asChild variant="ghost" className="mt-4 min-h-[44px] cursor-pointer rounded-full bg-primary/10 text-primary hover:bg-primary/15">
                        <Link to={chapterWorkbenchPath(bookId, selectedChapterNo)}>
                          打开该章节工作台
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
              {finalQuery.isLoading && activeChapter?.currentFinalId && (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-10/12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-8/12" />
                </div>
              )}
              {finalQuery.isError && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>
                    {formatApiErrorMessage(finalQuery.error, "成稿加载失败")}
                  </AlertDescription>
                </Alert>
              )}
              {finalQuery.data && (
                <div>
                  {finalQuery.data.summary && (
                    <Card className="mb-8 rounded-2xl border border-primary/15 bg-primary/5 text-sm shadow-none">
                      <CardContent className="px-5 py-4">
                        <div className="font-medium">本章提要</div>
                        <div className="mt-2 whitespace-pre-wrap leading-8">{finalQuery.data.summary}</div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="prose-zh whitespace-pre-wrap break-words font-serif text-foreground">{finalQuery.data.content}</div>
                </div>
              )}
              {!activeChapter && !chaptersQuery.isLoading && (
                <Card className="rounded-2xl border-dashed bg-background/70 text-sm">
                  <CardContent className="px-5 py-6">
                    当前书籍还没有章节。
                  </CardContent>
                </Card>
              )}
            </div>

            {activeChapter && (
              <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  className="min-h-[44px] cursor-pointer rounded-full px-5"
                  onClick={() => previousChapter && setSelectedChapterNo(previousChapter.chapterNo)}
                  disabled={!previousChapter}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一章
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  第 {selectedChapterNo ?? "—"} 章 · {activePosition} / {chapters.length}
                </div>
                <Button
                  variant="outline"
                  className="min-h-[44px] cursor-pointer rounded-full px-5"
                  onClick={() => nextChapter && setSelectedChapterNo(nextChapter.chapterNo)}
                  disabled={!nextChapter}
                >
                  下一章
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
