import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  return (
    <Dialog open={open && diffPreview !== null} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-4xl">
        {diffPreview && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                <div>
                  <DialogTitle>版本差异对比</DialogTitle>
                  <DialogDescription className="mt-1">
                    围绕当前勾选的两个历史版本，快速判断新增与移除内容。
                  </DialogDescription>
                </div>
                <Badge variant="success">{diffPreview.summary}</Badge>
              </div>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-muted p-5 shadow-sm">
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

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClearComparison}>
                清空比较
              </Button>
              <Button type="button" onClick={onClose}>
                关闭
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
