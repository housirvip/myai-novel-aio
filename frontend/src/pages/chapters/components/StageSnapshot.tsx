import { Hash, Layers } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ChapterStageView } from "@/lib/types";

export type StageSnapshotProps = {
  stageData: ChapterStageView | null;
  stageKey: string;
  wordCount: number | null;
  isLoading: boolean;
  isError: boolean;
};

export function StageSnapshot({ stageData, stageKey, wordCount, isLoading, isError }: StageSnapshotProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Stage Snapshot</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {stageKey} 阶段信息
          </div>
        </div>
        {stageData && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">
            {wordCount ?? "—"} 字
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      )}
      {isError && <div className="mt-4 text-sm text-warning">当前阶段还没有可读取内容，或接口返回了错误。</div>}
      {stageData && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="stat-card-primary">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              当前阶段
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{stageKey}</div>
          </div>
          <div className="stat-card-accent">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3.5 w-3.5 text-accent" />
              当前字数
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{wordCount ?? "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
