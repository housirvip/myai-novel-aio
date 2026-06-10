import type { ManualEntityRefs } from "../hooks/types";
import type { WorkflowTaskView } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

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
  mode: "initial" | "replan" | null;
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

  const title = mode === "initial" ? "生成 plan" : "重新 plan";
  const activeAuthorIntentPending = activeAuthorIntentTask && (
    activeAuthorIntentTask.status === "pending" ||
    activeAuthorIntentTask.status === "running" ||
    activeAuthorIntentTask.status === "terminating"
  );

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "initial"
              ? "会基于当前 workflow 参数生成新的 plan，并带上当前 manualEntityRefs 勾选结果。你可以补充本次意图，也可以留空后直接确定。"
              : "会基于当前 workflow 参数重新生成新的 plan 版本，并带上当前 manualEntityRefs 勾选结果。你可以补充本次意图，也可以留空后直接确定。"}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            本次带入的 manualEntityRefs
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">角色 {manualEntityRefs.characterIds.length}</Badge>
            <Badge variant="secondary">势力 {manualEntityRefs.factionIds.length}</Badge>
            <Badge variant="secondary">物品 {manualEntityRefs.itemIds.length}</Badge>
            <Badge variant="secondary">钩子 {manualEntityRefs.hookIds.length}</Badge>
            <Badge variant="secondary">关系 {manualEntityRefs.relationIds.length}</Badge>
            <Badge variant="secondary">世界设定 {manualEntityRefs.worldSettingIds.length}</Badge>
          </div>
        </div>

        <label className="block space-y-2 text-sm text-foreground">
          <span>{mode === "initial" ? "本次 plan 意图" : "本次重新 plan 意图"}</span>
          <Textarea
            value={intentDraft}
            onChange={(event) => onIntentDraftChange(event.target.value)}
            className="min-h-32"
            placeholder="可为空；留空时将不传 authorIntent。"
          />
        </label>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onGenerateAuthorIntent}
              disabled={generateAuthorIntentPending || isAnyWorkflowBusy}
              className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            >
              {generateAuthorIntentPending
                ? "提交中..."
                : activeAuthorIntentPending
                  ? "生成 authorIntent 中..."
                  : "生成 authorIntent"}
            </Button>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={workflowMutationPending}>
                取消
              </Button>
              <Button type="button" onClick={onConfirm} disabled={workflowMutationPending}>
                确定
              </Button>
            </DialogFooter>
          </div>

          {activeAuthorIntentTask && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    {getWorkflowTaskStatusLabel(activeAuthorIntentTask.status)} · {getWorkflowTaskStageLabel(activeAuthorIntentTask.stage)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    任务 #{activeAuthorIntentTask.id}
                    {activeAuthorIntentTask.progressPercent != null ? ` · ${activeAuthorIntentTask.progressPercent}%` : ""}
                  </div>
                </div>
                {activeAuthorIntentPending && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onTerminateTask(activeAuthorIntentTask.id)}
                    disabled={activeAuthorIntentTask.status === "terminating" || terminatePending}
                  >
                    {activeAuthorIntentTask.status === "terminating" ? "终止中..." : terminatePending ? "提交中..." : "终止任务"}
                  </Button>
                )}
              </div>
              {activeAuthorIntentTask.progressPercent != null && (
                <Progress className="mt-3" value={activeAuthorIntentTask.progressPercent} />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
