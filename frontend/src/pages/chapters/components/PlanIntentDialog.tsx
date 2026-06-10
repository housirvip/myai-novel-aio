import type { ManualEntityRefs } from "../hooks/types";
import type { WorkflowTaskView } from "@/lib/types";

function getWorkflowTaskStatusLabel(status: WorkflowTaskView["status"]) {
  if (status === "pending") return "排队中";
  if (status === "running") return "执行中";
  if (status === "terminating") return "终止中";
  if (status === "terminated") return "已终止";
  if (status === "succeeded") return "已完成";
  return "失败";
}

function getWorkflowTaskStageLabel(stage: string | null) {
  if (!stage) {
    return "等待调度";
  }

  const labels: Record<string, string> = {
    queued: "任务排队中",
    loading_chapter: "加载章节数据",
    retrieving_initial_context: "检索初始上下文",
    generating_author_intent: "生成作者意图",
    extracting_intent_keywords: "提取意图关键词",
    retrieving_final_context: "检索最终上下文",
    generating_plan: "生成计划",
    loading_plan_context: "加载计划上下文",
    generating_draft: "生成草稿",
    repairing_length: "修正篇幅",
    generating_review: "生成审阅意见",
    loading_review_context: "加载审阅上下文",
    generating_repair: "生成修订稿",
    generating_final: "生成定稿",
    extracting_diff: "提取结构化变更",
    updating_resources: "更新资源实体",
    persisting_sidecar_artifacts: "写入检索附属产物",
    saving_artifacts: "保存阶段产物",
  };

  return labels[stage] ?? stage.replaceAll("_", " ");
}

export type PlanIntentDialogProps = {
  mode: "initial" | null;
  intentDraft: string;
  onIntentDraftChange: (value: string) => void;
  manualEntityRefs: ManualEntityRefs;
  onConfirm: () => void;
  onCancel: () => void;
  onGenerateAuthorIntent: () => void;
  generateAuthorIntentPending: boolean;
  isAnyWorkflowBusy: boolean;
  workflowMutationPending: boolean;
  activeAuthorIntentTask: WorkflowTaskView | null;
  onTerminateTask: (taskId: number) => void;
  terminatePending: boolean;
};

export function PlanIntentDialog({
  mode,
  intentDraft,
  onIntentDraftChange,
  manualEntityRefs,
  onConfirm,
  onCancel,
  onGenerateAuthorIntent,
  generateAuthorIntentPending,
  isAnyWorkflowBusy,
  workflowMutationPending,
  activeAuthorIntentTask,
  onTerminateTask,
  terminatePending,
}: PlanIntentDialogProps) {
  if (!mode) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm px-4 pt-28 sm:pt-32 animate-in fade-in-0 duration-200" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-intent-dialog-title"
        className="w-full max-w-xl rounded-xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="plan-intent-dialog-title"
          className="text-lg font-semibold text-foreground"
        >
          生成 plan
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          会基于当前 workflow 参数生成新的 plan，并带上当前 manualEntityRefs 勾选结果。你可以补充本次意图，也可以留空后直接确定。
        </p>
        <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-foreground">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            本次带入的 manualEntityRefs
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              角色 {manualEntityRefs.characterIds.length}
            </span>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              势力 {manualEntityRefs.factionIds.length}
            </span>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              物品 {manualEntityRefs.itemIds.length}
            </span>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              钩子 {manualEntityRefs.hookIds.length}
            </span>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              关系 {manualEntityRefs.relationIds.length}
            </span>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
              世界设定 {manualEntityRefs.worldSettingIds.length}
            </span>
          </div>
        </div>
        <label className="mt-4 block space-y-2 text-sm text-foreground">
          <span>本次 plan 意图</span>
          <textarea
            value={intentDraft}
            onChange={(event) => onIntentDraftChange(event.target.value)}
            className="min-h-32 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            placeholder="可为空；留空时将不传 authorIntent。"
          />
        </label>
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onGenerateAuthorIntent}
              disabled={generateAuthorIntentPending || isAnyWorkflowBusy}
              className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
              {generateAuthorIntentPending
                ? "提交中..."
                : activeAuthorIntentTask &&
                    (activeAuthorIntentTask.status === "pending" ||
                      activeAuthorIntentTask.status === "running" ||
                      activeAuthorIntentTask.status === "terminating")
                  ? "生成 authorIntent 中..."
                  : "生成 authorIntent"}
            </button>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={workflowMutationPending}
                className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                disabled={workflowMutationPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                确定
              </button>
            </div>
          </div>

          {activeAuthorIntentTask && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    {getWorkflowTaskStatusLabel(
                      activeAuthorIntentTask.status,
                    )}{" "}
                    ·{" "}
                    {getWorkflowTaskStageLabel(
                      activeAuthorIntentTask.stage,
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    任务 #{activeAuthorIntentTask.id}
                    {activeAuthorIntentTask.progressPercent != null
                      ? ` · ${activeAuthorIntentTask.progressPercent}%`
                      : ""}
                  </div>
                </div>
                {(activeAuthorIntentTask.status === "pending" ||
                  activeAuthorIntentTask.status === "running" ||
                  activeAuthorIntentTask.status === "terminating") && (
                  <button
                    type="button"
                    onClick={() =>
                      onTerminateTask(activeAuthorIntentTask.id)
                    }
                    disabled={
                      activeAuthorIntentTask.status === "terminating" ||
                      terminatePending
                    }
                    className="rounded-lg border border-destructive/30 bg-background px-3 py-2 text-xs font-medium text-destructive disabled:opacity-60"
                  >
                    {activeAuthorIntentTask.status === "terminating"
                      ? "终止中..."
                      : terminatePending
                        ? "提交中..."
                        : "终止任务"}
                  </button>
                )}
              </div>
              {activeAuthorIntentTask.progressPercent != null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${activeAuthorIntentTask.progressPercent}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
