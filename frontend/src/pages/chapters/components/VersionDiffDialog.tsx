export type VersionDiffDialogProps = {
  open: boolean;
  diffPreview: {
    summary: string;
    addedLines: string[];
    removedLines: string[];
  } | null;
  onClose: () => void;
  onClearComparison: () => void;
};

export function VersionDiffDialog({
  open,
  diffPreview,
  onClose,
  onClearComparison,
}: VersionDiffDialogProps) {
  if (!open || !diffPreview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm px-4 py-16 sm:pt-20 animate-in fade-in-0 duration-200" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-diff-dialog-title"
        className="w-full max-w-4xl rounded-xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              id="history-diff-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              版本差异对比
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              围绕当前勾选的两个历史版本，快速判断新增与移除内容。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/30">
              {diffPreview.summary}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-muted p-5 shadow-sm">
          <div className="grid gap-4 text-sm text-foreground lg:grid-cols-2">
            <div className="rounded-lg bg-card p-4 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                新增内容
              </div>
              <div className="space-y-2">
                {diffPreview.addedLines.length > 0 ? (
                  diffPreview.addedLines.map((line) => (
                    <div
                      key={`add-${line}`}
                      className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/30"
                    >
                      + {line}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    没有识别到新增段落。
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-card p-4 ring-1 ring-destructive/20">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-destructive">
                移除内容
              </div>
              <div className="space-y-2">
                {diffPreview.removedLines.length > 0 ? (
                  diffPreview.removedLines.map((line) => (
                    <div
                      key={`remove-${line}`}
                      className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20"
                    >
                      - {line}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    没有识别到移除段落。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClearComparison}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            清空比较
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
