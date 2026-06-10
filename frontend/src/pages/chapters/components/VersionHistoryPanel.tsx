import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import type { ChapterStage, ChapterStageHistoryEntry } from "@/lib/types";

type VersionHistoryPanelProps = {
  activeStageKey: ChapterStage;
  historyEntries: ChapterStageHistoryEntry[];
  isLoading: boolean;
  historyLimit: number;
  historyLimitOptions: readonly number[];
  onHistoryLimitChange: (limit: number) => void;
  selectedHistory: ChapterStageHistoryEntry | null;
  onSelectHistory: (id: number) => void;
  comparisonIds: number[];
  onToggleComparison: (id: number) => void;
  onClearComparison: () => void;
  onOpenDiffDialog: () => void;
  comparisonEntries: ChapterStageHistoryEntry[];
  historyContentExpanded: boolean;
  onToggleContentExpanded: () => void;
};

export function VersionHistoryPanel({
  historyEntries,
  isLoading,
  historyLimit,
  historyLimitOptions,
  onHistoryLimitChange,
  selectedHistory,
  onSelectHistory,
  comparisonIds,
  onToggleComparison,
  onClearComparison,
  onOpenDiffDialog,
  comparisonEntries,
  historyContentExpanded,
  onToggleContentExpanded,
}: VersionHistoryPanelProps) {
  const comparisonCurrent = comparisonEntries[0];
  const comparisonPrevious = comparisonEntries[1];

  return (
    <div>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">版本历史</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                按版本号倒序展示当前 stage 的最近版本，可切换查看详情或勾选两个版本进行差异对比。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="history-limit-select">
                history limit
              </label>
              <Select value={String(historyLimit)} onValueChange={(value) => onHistoryLimitChange(Number(value))}>
                <SelectTrigger id="history-limit-select" aria-label="history limit" className="h-8 w-24 rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {historyLimitOptions.map((limit) => (
                    <SelectItem key={limit} value={String(limit)}>
                      {limit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            )}
            {!isLoading && historyEntries.length === 0 && (
              <div className="text-sm text-muted-foreground">当前 stage 还没有历史版本。</div>
            )}
            {historyEntries.map((entry) => {
              const isSelected = selectedHistory?.id === entry.id;
              const isCompared = comparisonIds.includes(entry.id);
              const comparisonDisabled = comparisonIds.length >= 2 && !isCompared;
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                    isSelected ? "border-primary bg-card shadow-sm" : "border-transparent bg-card text-muted-foreground"
                  }`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectHistory(entry.id)}
                    className="h-auto flex-1 justify-start p-0 text-left text-sm hover:bg-transparent"
                  >
                    <span className="block w-full">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          v{entry.versionNo} {entry.isCurrent ? "· current" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(entry.updatedAt).toLocaleString("zh-CN")}</span>
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">字数：{entry.wordCount ?? "—"}</span>
                      {entry.summary && <span className="mt-2 block line-clamp-3 text-xs text-muted-foreground">{entry.summary}</span>}
                    </span>
                  </Button>
                  <label className={`mt-1 flex shrink-0 items-center gap-2 text-xs ${comparisonDisabled ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                    <Checkbox
                      aria-label={`对比 v${entry.versionNo}`}
                      checked={isCompared}
                      disabled={comparisonDisabled}
                      onCheckedChange={(checked) => {
                        if (checked === true || isCompared) {
                          onToggleComparison(entry.id);
                        }
                      }}
                    />
                    <span>对比</span>
                  </label>
                </div>
              );
            })}
          </div>

          {comparisonIds.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">Comparison</div>
                  <div className="mt-1 font-medium text-foreground">
                    {comparisonEntries.length === 2
                      ? `已选择 v${comparisonPrevious?.versionNo} ↔ v${comparisonCurrent?.versionNo}`
                      : `已选择 v${comparisonEntries[0]?.versionNo ?? "—"}`}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {comparisonEntries.length === 2 ? "已可查看差异浮层。" : "再勾选一个版本即可比较。"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {comparisonEntries.length === 2 && (
                    <Button type="button" size="sm" onClick={onOpenDiffDialog}>
                      查看差异
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={onClearComparison}>
                    清空比较
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedHistory && (
            <div className="mt-4 rounded-xl border border-border bg-muted p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">Selected Version</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">v{selectedHistory.versionNo}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedHistory.isCurrent ? "当前版本" : "历史版本"}
                    {" · "}
                    {selectedHistory.wordCount ?? "—"} 字
                    {" · "}
                    {new Date(selectedHistory.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">summary</div>
                  <div className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap leading-6">{selectedHistory.summary || "—"}</div>
                </div>
                <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">full content</div>
                    <Button type="button" variant="outline" size="sm" onClick={onToggleContentExpanded}>
                      {historyContentExpanded ? "收起正文" : "展开正文"}
                    </Button>
                  </div>
                  {historyContentExpanded && (
                    <div className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap leading-6">{selectedHistory.content || "—"}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
