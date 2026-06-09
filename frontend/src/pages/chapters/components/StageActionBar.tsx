import type { StageTab, WorkflowAction } from "../hooks/types";
import type { ChapterStage } from "@/lib/types";

export type StageActionBarProps = {
  activeTab: StageTab;
  activeStageKey: ChapterStage | null;
  stageIsEditable: boolean;
  availableActions: WorkflowAction[];
  isAnyWorkflowBusy: boolean;
  workflowMutationPending: boolean;
  workflowMutationAction: WorkflowAction | undefined;
  activeWorkflowTaskType: string | null;
  saveStageMutationPending: boolean;
  editorContentEmpty: boolean;
  isDirty: boolean;
  onOpenInitialPlanDialog: () => void;
  onStartWorkflow: (request: { action: WorkflowAction }) => void;
  onRerunPlan: () => void;
  onSaveStage: () => void;
};

export function StageActionBar({
  activeTab,
  activeStageKey,
  stageIsEditable,
  availableActions,
  isAnyWorkflowBusy,
  workflowMutationPending,
  workflowMutationAction,
  activeWorkflowTaskType,
  saveStageMutationPending,
  editorContentEmpty,
  onOpenInitialPlanDialog,
  onStartWorkflow,
  onRerunPlan,
  onSaveStage,
}: StageActionBarProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-muted p-4">
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>
          {activeTab === "review"
            ? "Review 阶段当前为只读；可直接从这里发起 repair 或 approve。"
            : activeTab === "plan"
              ? "保存可写回当前 plan；可直接从这里重新 plan，或基于当前 plan 发起 draft。"
              : activeTab === "draft"
                ? "保存可写回当前 draft；也可以直接基于当前 draft 发起 review。"
                : "保存会创建新版本并更新 current pointer。"}
        </div>
        <div>右侧控制区已收拢到这里，便于在同一视线内完成编辑与执行。</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeTab === "plan" && availableActions.includes("plan") && (
          <button
            onClick={onOpenInitialPlanDialog}
            disabled={isAnyWorkflowBusy}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "plan" ? "生成 plan 中..." : activeWorkflowTaskType === "plan" ? "plan 执行中..." : "生成 plan"}
          </button>
        )}
        {activeTab === "plan" && (
          <button
            onClick={() => onStartWorkflow({ action: "draft" })}
            disabled={!availableActions.includes("draft") || isAnyWorkflowBusy}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "draft" ? "生成 draft 中..." : activeWorkflowTaskType === "draft" ? "draft 执行中..." : "生成 draft"}
          </button>
        )}
        {activeTab === "draft" && (
          <button
            onClick={() => onStartWorkflow({ action: "review" })}
            disabled={!availableActions.includes("review") || isAnyWorkflowBusy}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "review" ? "生成 review 中..." : activeWorkflowTaskType === "review" ? "review 执行中..." : "生成 review"}
          </button>
        )}
        {activeTab === "review" && (
          <button
            onClick={() => onStartWorkflow({ action: "repair" })}
            disabled={!availableActions.includes("repair") || isAnyWorkflowBusy}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "repair" ? "生成 repair 中..." : activeWorkflowTaskType === "repair" ? "repair 执行中..." : "生成 repair"}
          </button>
        )}
        {activeTab === "review" && (
          <button
            onClick={() => onStartWorkflow({ action: "approve" })}
            disabled={!availableActions.includes("approve") || isAnyWorkflowBusy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white dark:bg-emerald-500 disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "approve"
              ? "批准中..."
              : activeWorkflowTaskType === "approve"
                ? "approve 执行中..."
                : "批准成稿"}
          </button>
        )}
        {activeTab === "plan" && (
          <button
            onClick={onRerunPlan}
            disabled={isAnyWorkflowBusy}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-60"
          >
            {workflowMutationPending && workflowMutationAction === "plan" ? "重新 plan 中..." : activeWorkflowTaskType === "plan" ? "plan 执行中..." : "重新 plan"}
          </button>
        )}
        {stageIsEditable && (
          <button
            onClick={onSaveStage}
            disabled={saveStageMutationPending || editorContentEmpty || isAnyWorkflowBusy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saveStageMutationPending ? "保存中..." : `保存 ${activeStageKey}`}
          </button>
        )}
      </div>
    </div>
  );
}
