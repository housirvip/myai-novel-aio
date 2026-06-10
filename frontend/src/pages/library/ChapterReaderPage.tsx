import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

export function ChapterReaderPage() {
  const params = useParams();
  const bookId = parseBookId(params.bookId);
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [fontScale, setFontScale] = useState(18);
  const [wideMode, setWideMode] = useState(false);

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
    <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">章节目录</h2>
              <p className="mt-1 text-xs text-muted-foreground">按章节顺序连续阅读，未完成章节也会保留入口。</p>
            </div>
            <Badge variant="outline" className="shrink-0 whitespace-nowrap px-4 py-2 text-sm">
              {finalChapterNos.length} / {chapters.length}
            </Badge>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-xs leading-6 text-muted-foreground">
            {selectionHint}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {chaptersQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            )}
            {!chaptersQuery.isLoading && chapters.length === 0 && (
              <div className="rounded-lg bg-muted px-4 py-4 text-muted-foreground">当前书籍还没有章节。</div>
            )}
            {chapters.map((chapter) => {
              const selected = chapter.chapterNo === selectedChapterNo;
              return (
                <Button
                  key={chapter.id}
                  variant={selected ? "default" : "outline"}
                  onClick={() => setSelectedChapterNo(chapter.chapterNo)}
                  className={cn(
                    "w-full text-left h-auto flex-col items-start py-3",
                    selected && "shadow-glow",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-medium">第 {chapter.chapterNo} 章</span>
                    <div className="flex items-center gap-2">
                      {selected && <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground">当前</Badge>}
                      <Badge
                        variant={chapter.currentFinalId ? "success" : "warning"}
                        className={selected ? "bg-primary-foreground/15 text-primary-foreground" : undefined}
                      >
                        {chapter.currentFinalId ? "Final" : "待完成"}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn("mt-1 line-clamp-1 text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {chapter.title || "未命名章节"}
                  </div>
                  <div className={cn("mt-2 text-[11px]", selected ? "text-primary-foreground/75" : "text-muted-foreground/60")}>
                    状态：{chapter.status}
                  </div>
                </Button>
              );
            })}
          </div>
        </Card>
      </aside>

      <article>
        <Card className="p-6 transition lg:p-8 text-foreground">
          <div className={cn("mx-auto", wideMode ? "max-w-5xl" : "max-w-3xl")}>
            <div className="sticky top-4 z-10 rounded-xl border border-border bg-card/90 px-5 py-4 shadow-md backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">成稿阅读页</p>
                  <h1 className="mt-2 font-serif text-3xl font-semibold text-foreground lg:text-4xl">
                    {activeChapter?.title || bookQuery.data?.title || "章节成稿阅读"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {bookQuery.data?.title ? `${bookQuery.data.title} · ` : ""}第 {selectedChapterNo ?? "—"} 章
                  </p>
                  {activeChapter && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">
                        {activeChapter.currentFinalId ? "可阅读 Final" : "暂无 Final"}
                      </Badge>
                      <Badge variant="secondary">
                        状态：{activeChapter.status}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => previousChapter && setSelectedChapterNo(previousChapter.chapterNo)}
                    disabled={!previousChapter}
                  >
                    上一章
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => nextChapter && setSelectedChapterNo(nextChapter.chapterNo)}
                    disabled={!nextChapter}
                  >
                    下一章
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setFontScale((value) => Math.max(16, value - 2))}
                  >
                    A-
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setFontScale((value) => Math.min(28, value + 2))}
                  >
                    A+
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setWideMode((value) => !value)}
                  >
                    {wideMode ? "常规宽度" : "加宽版心"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  >
                    {resolvedTheme === "dark" ? "亮色" : "暗色"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl px-2 text-foreground" style={{ fontSize: `${fontScale}px`, lineHeight: 1.95 }}>
              {chaptersQuery.isLoading && <p>正在载入阅读数据...</p>}
              {!chaptersQuery.isLoading && activeChapter && !activeChapter.currentFinalId && (
                <Card className="text-sm">
                  <CardContent className="px-5 py-6">
                    <div className="font-medium">这一章还没有 final 成稿。</div>
                    <div className="mt-2 leading-7">
                      阅读页保持只读 final 的边界，不会自动回退到 draft。你可以先去章节工作台完成 approve，再回来继续阅读。
                    </div>
                    {selectedChapterNo !== null && (
                      <Button asChild variant="ghost" className="mt-4 text-primary bg-primary/10">
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
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
              {finalQuery.isError && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>
                    {formatApiErrorMessage(finalQuery.error, "成稿加载失败")}
                  </AlertDescription>
                </Alert>
              )}
              {finalQuery.data && (
                <div className="space-y-6">
                  {finalQuery.data.summary && (
                    <Card className="text-sm">
                      <CardContent className="px-5 py-4">
                        <div className="font-medium">章节摘要</div>
                        <div className="mt-2 whitespace-pre-wrap leading-7">{finalQuery.data.summary}</div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="prose-zh whitespace-pre-wrap font-serif leading-[1.85]">{finalQuery.data.content}</div>
                </div>
              )}
              {!activeChapter && !chaptersQuery.isLoading && (
                <Card className="text-sm">
                  <CardContent className="px-5 py-6">
                    当前书籍还没有章节。
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </Card>
      </article>
    </section>
  );
}
