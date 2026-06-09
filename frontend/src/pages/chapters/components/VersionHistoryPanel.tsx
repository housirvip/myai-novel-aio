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
              <select
                id="history-limit-select"
                value={historyLimit}
                onChange={(event) => onHistoryLimitChange(Number(event.target.value))}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
              >
                {historyLimitOptions.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
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
                  <button
                    type="button"
                    onClick={() => onSelectHistory(entry.id)}
                    className="block flex-1 text-left text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-foreground">
                        v{entry.versionNo} {entry.isCurrent ? "· current" : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(entry.updatedAt).toLocaleString("zh-CN")}</div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">字数：{entry.wordCount ?? "—"}</div>
                    {entry.summary && <div className="mt-2 line-clamp-3 text-xs text-muted-foreground">{entry.summary}</div>}
                  </button>
                  <label className={`mt-1 flex shrink-0 items-center gap-2 text-xs ${comparisonDisabled ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                    <input
                      type="checkbox"
                      aria-label={`对比 v${entry.versionNo}`}
                      checked={isCompared}
                      disabled={comparisonDisabled}
                      onChange={() => onToggleComparison(entry.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
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
                    <button
                      type="button"
                      onClick={onOpenDiffDialog}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                    >
                      查看差异
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClearComparison}
                    className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground"
                  >
                    清空比较
                  </button>
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
                    <button
                      type="button"
                      onClick={onToggleContentExpanded}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-border hover:bg-muted/80"
                    >
                      {historyContentExpanded ? "收起正文" : "展开正文"}
                    </button>
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
