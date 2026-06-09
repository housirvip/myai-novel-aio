import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useTheme } from "@/components/theme-provider";

import { Skeleton } from "@/components/ui/skeleton";
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
  const isDark = resolvedTheme === "dark";
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
      <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">章节目录</h2>
            <p className="mt-1 text-xs text-muted-foreground">按章节顺序连续阅读，未完成章节也会保留入口。</p>
          </div>
          <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
            {finalChapterNos.length} / {chapters.length}
          </span>
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
              <button
                key={chapter.id}
                onClick={() => setSelectedChapterNo(chapter.chapterNo)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-glow"
                    : "border-border bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">第 {chapter.chapterNo} 章</span>
                  <div className="flex items-center gap-2">
                    {selected && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">当前</span>}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        selected
                          ? "bg-white/20"
                          : chapter.currentFinalId
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {chapter.currentFinalId ? "Final" : "待完成"}
                    </span>
                  </div>
                </div>
                <div className={`mt-1 line-clamp-1 text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {chapter.title || "未命名章节"}
                </div>
                <div className={`mt-2 text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground/60"}`}>
                  状态：{chapter.status}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <article className={`rounded-xl border p-6 shadow-sm transition lg:p-8 ${isDark ? "border-slate-800 bg-slate-950 text-slate-100" : "border-border bg-card text-foreground"}`}>
        <div className={`mx-auto ${wideMode ? "max-w-5xl" : "max-w-3xl"}`}>
          <div className={`sticky top-4 z-10 rounded-xl border px-5 py-4 backdrop-blur ${isDark ? "border-slate-800 bg-slate-950/90" : "border-border bg-card/90"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${isDark ? "text-violet-300" : "text-primary"}`}>成稿阅读页</p>
                <h1 className={`mt-2 font-serif text-3xl font-semibold lg:text-4xl ${isDark ? "text-white" : "text-foreground"}`}>
                  {activeChapter?.title || bookQuery.data?.title || "章节成稿阅读"}
                </h1>
                <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>
                  {bookQuery.data?.title ? `${bookQuery.data.title} · ` : ""}第 {selectedChapterNo ?? "—"} 章
                </p>
                {activeChapter && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-3 py-1 ${isDark ? "bg-slate-900 text-slate-300" : "bg-muted text-muted-foreground"}`}>
                      {activeChapter.currentFinalId ? "可阅读 Final" : "暂无 Final"}
                    </span>
                    <span className={`rounded-full px-3 py-1 ${isDark ? "bg-slate-900 text-slate-300" : "bg-muted text-muted-foreground"}`}>
                      状态：{activeChapter.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => previousChapter && setSelectedChapterNo(previousChapter.chapterNo)}
                  disabled={!previousChapter}
                  className={`rounded-full px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}
                >
                  上一章
                </button>
                <button
                  onClick={() => nextChapter && setSelectedChapterNo(nextChapter.chapterNo)}
                  disabled={!nextChapter}
                  className={`rounded-full px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}
                >
                  下一章
                </button>
                <button
                  onClick={() => setFontScale((value) => Math.max(16, value - 2))}
                  className={`rounded-full px-3 py-2 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontScale((value) => Math.min(28, value + 2))}
                  className={`rounded-full px-3 py-2 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}
                >
                  A+
                </button>
                <button onClick={() => setWideMode((value) => !value)} className={`rounded-full px-3 py-2 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}>
                  {wideMode ? "常规宽度" : "加宽版心"}
                </button>
                <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`rounded-full px-3 py-2 ${isDark ? "bg-slate-800 text-slate-300" : "bg-secondary text-secondary-foreground"}`}>
                  {isDark ? "亮色" : "暗色"}
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-6 rounded-xl px-2 ${isDark ? "text-slate-200" : "text-muted-foreground"}`} style={{ fontSize: `${fontScale}px`, lineHeight: 1.95 }}>
            {chaptersQuery.isLoading && <p>正在载入阅读数据...</p>}
            {!chaptersQuery.isLoading && activeChapter && !activeChapter.currentFinalId && (
              <div className={`rounded-xl border px-5 py-6 text-sm ${isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-border bg-muted text-muted-foreground"}`}>
                <div className="font-medium">这一章还没有 final 成稿。</div>
                <div className="mt-2 leading-7">
                  阅读页保持只读 final 的边界，不会自动回退到 draft。你可以先去章节工作台完成 approve，再回来继续阅读。
                </div>
                {selectedChapterNo !== null && (
                  <Link
                    to={chapterWorkbenchPath(bookId, selectedChapterNo)}
                    className={`mt-4 inline-flex rounded-full px-4 py-2 text-xs font-medium ${isDark ? "bg-violet-500/20 text-violet-200" : "bg-primary/10 text-primary"}`}
                  >
                    打开该章节工作台
                  </Link>
                )}
              </div>
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
              <div className={`rounded-xl border px-5 py-6 text-sm ${isDark ? "border-rose-900 bg-rose-950/50 text-rose-200" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
                {formatApiErrorMessage(finalQuery.error, "成稿加载失败")}
              </div>
            )}
            {finalQuery.data && (
              <div className="space-y-6">
                {finalQuery.data.summary && (
                  <div className={`rounded-xl border px-5 py-4 text-sm ${isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-border bg-muted text-muted-foreground"}`}>
                    <div className="font-medium">章节摘要</div>
                    <div className="mt-2 whitespace-pre-wrap leading-7">{finalQuery.data.summary}</div>
                  </div>
                )}
                <div className="whitespace-pre-wrap font-serif leading-[1.85]">{finalQuery.data.content}</div>
              </div>
            )}
            {!activeChapter && !chaptersQuery.isLoading && (
              <div className={`rounded-xl border px-5 py-6 text-sm ${isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-border bg-muted text-muted-foreground"}`}>
                当前书籍还没有章节。
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
