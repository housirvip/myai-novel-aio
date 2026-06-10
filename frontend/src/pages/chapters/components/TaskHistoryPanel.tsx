import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";

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
  const [pendingTerminateTaskId, setPendingTerminateTaskId] = useState<number | null>(null);

  const confirmTerminateTask = () => {
    if (pendingTerminateTaskId === null) {
      return;
    }

    onTerminateTask(pendingTerminateTaskId);
    setPendingTerminateTaskId(null);
  };
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
                <Button
                  key={task.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onSelectTask(task.id)}
                  className={`block h-auto w-full justify-start rounded-lg border p-3 text-left text-sm transition hover:bg-card ${
                    isSelected ? "border-primary bg-card shadow-sm" : "border-transparent bg-card text-muted-foreground"
                  }`}
                >
                  <span className="block w-full">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {getWorkflowTaskTypeLabel(task.workflowType)} · 任务 #{task.id}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(task.updatedAt).toLocaleString("zh-CN")}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant={getStatusBadgeVariant(task.status)}>{statusLabel}</Badge>
                      <span>·</span>
                      <span>{stageLabel}</span>
                      {task.progressPercent != null && (
                        <>
                          <span>·</span>
                          <span>{task.progressPercent}%</span>
                        </>
                      )}
                    </span>
                  </span>
                </Button>
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
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (selectedTask.status !== "terminating") {
                      setPendingTerminateTaskId(selectedTask.id);
                    }
                  }}
                  disabled={selectedTask.status === "terminating" || terminatePending}
                >
                  {selectedTask.status === "terminating" ? "终止中..." : terminatePending ? "提交中..." : "终止任务"}
                </Button>
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
        <ConfirmDialog
          open={pendingTerminateTaskId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingTerminateTaskId(null);
            }
          }}
          title="终止任务"
          description="确定终止当前任务吗？任务会在当前步骤安全结束后停止。"
          confirmLabel="终止任务"
          destructive
          pending={terminatePending}
          onConfirm={confirmTerminateTask}
        />
      </div>
    </div>
  );
}

function getStatusBadgeVariant(status: WorkflowTaskView["status"]) {
  if (status === "succeeded") return "success";
  if (status === "failed" || status === "terminated") return "destructive";
  if (status === "pending" || status === "running" || status === "terminating") return "default";
  return "secondary";
}

function getAlertVariant(tone: WorkflowStatusCardViewModel["tone"]) {
  if (tone === "error") return "destructive";
  if (tone === "success") return "success";
  return "default";
}

function StatusCard({ card }: { card: WorkflowStatusCardViewModel }) {
  return (
    <Alert variant={getAlertVariant(card.tone)} className={card.tone === "running" ? "border-primary/20 bg-primary/5 text-primary" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">{card.eyebrow}</div>
          <AlertTitle className="mt-1 text-lg">{card.title}</AlertTitle>
          <AlertDescription className="mt-1 opacity-90">{card.detail}</AlertDescription>
        </div>
        {card.badge && <Badge variant={card.tone === "success" ? "success" : card.tone === "error" ? "destructive" : "secondary"}>{card.badge}</Badge>}
      </div>
      {card.progressPercent != null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>任务进度</span>
            <span>{card.progressPercent}%</span>
          </div>
          <Progress className="mt-2" value={card.progressPercent} />
        </div>
      )}
      {card.meta.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs opacity-90">
          {card.meta.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      )}
    </Alert>
  );
}
