import type { ChapterStage, PlanWorkflowInput } from "@/lib/types";

export type StageTab = ChapterStage | "task";

export type ManualEntityRefs = NonNullable<PlanWorkflowInput["manualEntityRefs"]>;

export type FeedbackState = {
  kind: "idle" | "running" | "success" | "error";
  title: string;
  detail: string;
};

const workflowActions = ["plan", "draft", "review", "repair", "approve"] as const;
export type WorkflowAction = (typeof workflowActions)[number];

export type WorkflowRunRequest = {
  action: WorkflowAction;
  dryRun?: boolean;
  authorIntentOverride?: string;
};
