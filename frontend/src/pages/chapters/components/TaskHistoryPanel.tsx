import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowTaskView } from "@/lib/types";
import {
  type WorkflowStatusCardViewModel,
  formatTaskPayload,
  getWorkflowTaskStatusLabel,
  getWorkflowTaskStageLabel,
  getWorkflowTaskTypeLabel,
} from "./workbench-utils";

type TaskHistoryPanelProps = {
  tasks: WorkflowTaskView[];
  isLoading: boolean;
  selectedTask: WorkflowTaskView | null;
  onSelectTask: (id: number) => void;
  taskDetailCard: WorkflowStatusCardViewModel;
  onTerminateTask: (taskId: number) => void;
  terminatePending: boolean;
};

export function TaskHistoryPanel({
  tasks,
  isLoading,
  selectedTask,
  onSelectTask,
  taskDetailCard,
  onTerminateTask,
  terminatePending,
}: TaskHistoryPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Task 历史</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                按时间倒序展示当前章节的 workflow task，可切换查看进度与详情。
              </p>
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
            {!isLoading && tasks.length === 0 && (
              <div className="text-sm text-muted-foreground">当前章节还没有 workflow task 记录。</div>
            )}
            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              const statusLabel = getWorkflowTaskStatusLabel(task.status);
              const stageLabel = getWorkflowTaskStageLabel(task.stage);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                    isSelected ? "border-primary bg-card shadow-sm" : "border-transparent bg-card text-muted-foreground"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">
                      {getWorkflowTaskTypeLabel(task.workflowType)} · 任务 #{task.id}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(task.updatedAt).toLocaleString("zh-CN")}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{statusLabel}</span>
                    <span>·</span>
                    <span>{stageLabel}</span>
                    {task.progressPercent != null && (
                      <>
                        <span>·</span>
                        <span>{task.progressPercent}%</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <StatusCard card={taskDetailCard} />

        {selectedTask && (
          <div className="rounded-xl border border-border bg-muted p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-primary">Task Detail</div>
                <h3 className="mt-1 text-lg font-semibold text-foreground">任务 #{selectedTask.id}</h3>
              </div>
              {(selectedTask.status === "pending" ||
                selectedTask.status === "running" ||
                selectedTask.status === "terminating") && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTask.status === "terminating") {
                      return;
                    }
                    if (!window.confirm("确定终止当前任务吗？任务会在当前步骤安全结束后停止。")) {
                      return;
                    }
                    onTerminateTask(selectedTask.id);
                  }}
                  disabled={selectedTask.status === "terminating" || terminatePending}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedTask.status === "terminating" ? "终止中..." : terminatePending ? "提交中..." : "终止任务"}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">workflow type</div>
                <div className="mt-2">{getWorkflowTaskTypeLabel(selectedTask.workflowType)}</div>
              </div>
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">status / stage</div>
                <div className="mt-2">
                  {getWorkflowTaskStatusLabel(selectedTask.status)} / {getWorkflowTaskStageLabel(selectedTask.stage)}
                </div>
              </div>
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">started / finished</div>
                <div className="mt-2 whitespace-pre-wrap">
                  {selectedTask.startedAt ? new Date(selectedTask.startedAt).toLocaleString("zh-CN") : "—"}
                  {"\n"}
                  {selectedTask.finishedAt ? new Date(selectedTask.finishedAt).toLocaleString("zh-CN") : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">plan / draft pointer</div>
                <div className="mt-2">
                  Plan #{selectedTask.currentPlanId ?? "—"} · Draft #{selectedTask.currentDraftId ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">result</div>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap leading-6">
                  {formatTaskPayload(selectedTask.result)}
                </pre>
              </div>
              <div className="rounded-lg bg-card p-4 ring-1 ring-border text-xs text-muted-foreground">
                <div className="font-medium text-foreground">error</div>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap leading-6">
                  {formatTaskPayload(selectedTask.error)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ card }: { card: WorkflowStatusCardViewModel }) {
  const toneClasses =
    card.tone === "error"
      ? "border-destructive/20 bg-destructive/5 text-destructive"
      : card.tone === "success"
        ? "border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
        : card.tone === "running"
          ? "border-primary/20 bg-primary/5 text-primary"
          : "border-border bg-muted text-muted-foreground";

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">{card.eyebrow}</div>
          <div className="mt-1 text-lg font-semibold">{card.title}</div>
          <div className="mt-1 text-sm opacity-90">{card.detail}</div>
        </div>
        {card.badge && (
          <span className="rounded-full bg-card/80 px-3 py-1 text-xs font-medium ring-1 ring-current/10">
            {card.badge}
          </span>
        )}
      </div>
      {card.progressPercent != null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>任务进度</span>
            <span>{card.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-current transition-all"
              style={{ width: `${Math.max(0, Math.min(100, card.progressPercent))}%` }}
            />
          </div>
        </div>
      )}
      {card.meta.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs opacity-90">
          {card.meta.map((item) => (
            <span key={item} className="rounded-full bg-card/80 px-3 py-1 ring-1 ring-current/10">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
