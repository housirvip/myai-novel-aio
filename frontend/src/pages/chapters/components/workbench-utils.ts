import type { WorkflowTaskType, WorkflowTaskView } from "@/lib/types";

export type WorkflowStatusCardViewModel = {
  tone: "idle" | "running" | "success" | "error";
  eyebrow: string;
  title: string;
  detail: string;
  badge: string | null;
  progressPercent: number | null;
  meta: string[];
};

export function getWorkflowTaskTypeLabel(type: WorkflowTaskType) {
  if (type === "author_intent") return "authorIntent";
  if (type === "plan") return "Plan";
  if (type === "draft") return "Draft";
  if (type === "review") return "Review";
  if (type === "repair") return "Repair";
  return "Approve";
}

export function getWorkflowTaskStatusLabel(status: WorkflowTaskView["status"]) {
  if (status === "pending") return "排队中";
  if (status === "running") return "执行中";
  if (status === "terminating") return "终止中";
  if (status === "terminated") return "已终止";
  if (status === "succeeded") return "已完成";
  return "失败";
}

export function getWorkflowTaskStageLabel(stage: string | null) {
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

export function formatTaskPayload(value: unknown) {
  if (value == null) {
    return "—";
  }

  const maxLength = 1000;
  const text = (() => {
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  })();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n\n... 已截断，剩余 ${text.length - maxLength} 个字符未显示`;
}

function getWorkflowTaskResultMeta(task: WorkflowTaskView) {
  const meta: string[] = [];
  if (task.currentPlanId) {
    meta.push(`Plan #${task.currentPlanId}`);
  }
  if (task.currentDraftId) {
    meta.push(`Draft #${task.currentDraftId}`);
  }
  const result = task.result as { reviewId?: number; finalId?: number } | null;
  if (result?.reviewId) {
    meta.push(`Review #${result.reviewId}`);
  }
  if (result?.finalId) {
    meta.push(`Final #${result.finalId}`);
  }
  return meta;
}

export function getWorkflowStatusCardViewModel(
  task: WorkflowTaskView | null,
  feedback: { kind: "idle" | "running" | "success" | "error"; title: string; detail: string },
): WorkflowStatusCardViewModel {
  if (task) {
    const typeLabel = getWorkflowTaskTypeLabel(task.workflowType);
    const statusLabel = getWorkflowTaskStatusLabel(task.status);
    const stageLabel = getWorkflowTaskStageLabel(task.stage);
    const baseMeta = [
      `任务 #${task.id}`,
      statusLabel,
      ...(task.startedAt ? [new Date(task.startedAt).toLocaleString("zh-CN")] : []),
      ...getWorkflowTaskResultMeta(task),
    ];

    if (task.status === "pending" || task.status === "running" || task.status === "terminating") {
      return {
        tone: "running",
        eyebrow: `${typeLabel} Task`,
        title: task.status === "terminating" ? `${typeLabel} 正在终止` : `${typeLabel} 正在执行`,
        detail: task.status === "terminating" ? `终止请求已提交，当前阶段：${stageLabel}` : `当前阶段：${stageLabel}`,
        badge: statusLabel,
        progressPercent: task.progressPercent,
        meta: baseMeta,
      };
    }

    if (task.status === "succeeded") {
      return {
        tone: "success",
        eyebrow: `${typeLabel} Task`,
        title: `${typeLabel} 已完成`,
        detail: `最近一次任务已完成，当前阶段停留在：${stageLabel}`,
        badge: statusLabel,
        progressPercent: task.progressPercent,
        meta: [
          ...baseMeta,
          ...(task.finishedAt ? [`完成于 ${new Date(task.finishedAt).toLocaleString("zh-CN")}`] : []),
        ],
      };
    }

    if (task.status === "terminated") {
      return {
        tone: "idle",
        eyebrow: `${typeLabel} Task`,
        title: `${typeLabel} 已终止`,
        detail: task.error?.message ?? `任务已在阶段 ${stageLabel} 停止。`,
        badge: statusLabel,
        progressPercent: task.progressPercent,
        meta: [
          ...baseMeta,
          ...(task.finishedAt ? [`结束于 ${new Date(task.finishedAt).toLocaleString("zh-CN")}`] : []),
        ],
      };
    }

    return {
      tone: "error",
      eyebrow: `${typeLabel} Task`,
      title: `${typeLabel} 执行失败`,
      detail: task.error?.message ?? `最近一次任务失败在：${stageLabel}`,
      badge: statusLabel,
      progressPercent: task.progressPercent,
      meta: [
        ...baseMeta,
        ...(task.finishedAt ? [`结束于 ${new Date(task.finishedAt).toLocaleString("zh-CN")}`] : []),
      ],
    };
  }

  return {
    tone: feedback.kind,
    eyebrow: "Workflow Status",
    title: feedback.title,
    detail: feedback.detail,
    badge: null,
    progressPercent: null,
    meta: [],
  };
}
