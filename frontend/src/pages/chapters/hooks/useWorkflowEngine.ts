import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatApiErrorMessage } from "@/lib/api";
import { getChapterStage, getChapterWorkflowState } from "@/lib/chapters-api";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  ChapterStage,
  WorkflowTaskType,
  WorkflowTaskView,
} from "@/lib/types";
import {
  getLatestChapterWorkflowTask,
  getWorkflowTask,
  listChapterWorkflowTasks,
  runApprove,
  startApproveTask,
  startAuthorIntentTask,
  startDraftTask,
  startPlanTask,
  startRepairTask,
  startReviewTask,
  terminateWorkflowTask,
} from "@/lib/workflows-api";

import type { FeedbackState, ManualEntityRefs, StageTab, WorkflowRunRequest } from "./types";
import type { WorkflowProvider } from "./useWorkflowSettings";

const completedStageByWorkflow: Partial<Record<WorkflowTaskType, ChapterStage>> = {
  plan: "plan",
  draft: "draft",
  review: "review",
  repair: "draft",
  approve: "final",
};

export function useWorkflowEngine(params: {
  bookId: number | null;
  chapterNo: number | null;
  provider: WorkflowProvider;
  lowModel: string;
  midModel: string;
  highModel: string;
  targetWords: string;
  manualEntityRefs: ManualEntityRefs;
  activeTab: StageTab;
  onWorkflowComplete: (workflowType: WorkflowTaskType) => void;
}) {
  const {
    bookId,
    chapterNo,
    provider,
    lowModel,
    midModel,
    highModel,
    targetWords,
    manualEntityRefs,
    activeTab,
    onWorkflowComplete,
  } = params;

  const queryClient = useQueryClient();
  const safeBookId = bookId ?? 0;
  const safeChapterNo = chapterNo ?? 0;

  // ------ State ------

  const [activeWorkflowTaskId, setActiveWorkflowTaskId] = useState<number | null>(null);
  const [activeWorkflowTaskType, setActiveWorkflowTaskType] = useState<WorkflowTaskType | null>(null);
  const [lastCompletedWorkflowTask, setLastCompletedWorkflowTask] = useState<WorkflowTaskView | null>(null);
  const workflowSubmitLockRef = useRef(false);
  const completionInProgressRef = useRef(false);
  const currentChapterRef = useRef({ bookId: safeBookId, chapterNo: safeChapterNo });
  currentChapterRef.current = { bookId: safeBookId, chapterNo: safeChapterNo };
  const lastWorkflowFeedbackKeyRef = useRef<string | null>(null);
  const [planIntentDialogMode, setPlanIntentDialogMode] = useState<"initial" | null>(null);
  const [planIntentDraft, setPlanIntentDraft] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    title: "等待操作",
    detail: "这里会显示 workflow 与阶段保存的最近动作。",
  });

  // ------ Queries ------

  const workflowStateQuery = useQuery({
    queryKey: queryKeys.chapterWorkflowState(safeBookId, safeChapterNo),
    queryFn: () => getChapterWorkflowState(safeBookId, safeChapterNo),
    enabled: bookId !== null && chapterNo !== null,
  });

  const latestAuthorIntentTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "author_intent"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "author_intent"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const latestPlanTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "plan"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "plan"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const latestDraftTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "draft"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "draft"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const latestReviewTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "review"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "review"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const latestRepairTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "repair"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "repair"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const latestApproveTaskQuery = useQuery({
    queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "approve"),
    queryFn: () => getLatestChapterWorkflowTask(safeBookId, safeChapterNo, "approve"),
    enabled: bookId !== null && chapterNo !== null && activeWorkflowTaskId === null,
  });

  const workflowTaskQuery = useQuery({
    queryKey: queryKeys.workflowTask(activeWorkflowTaskId ?? "idle"),
    queryFn: () => getWorkflowTask(activeWorkflowTaskId as number),
    enabled: activeWorkflowTaskId !== null,
    refetchInterval: (query) => {
      const task = query.state.data as WorkflowTaskView | undefined;
      if (!task) {
        return 2000;
      }
      return task.status === "pending" || task.status === "running" || task.status === "terminating" ? 2000 : false;
    },
  });

  const workflowTaskHistoryQuery = useQuery({
    queryKey: queryKeys.chapterWorkflowTasks(safeBookId, safeChapterNo, 20),
    queryFn: () => listChapterWorkflowTasks(safeBookId, safeChapterNo, 20),
    enabled: bookId !== null && chapterNo !== null,
  });

  // ------ refreshChapter ------

  const refreshChapter = useCallback(async (completedStage?: ChapterStage) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.chapter(safeBookId, safeChapterNo) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterWorkflowState(safeBookId, safeChapterNo) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "plan") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "draft") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "review") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "final") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "plan") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "draft") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "review") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "final") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "author_intent") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "plan") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "review") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "repair") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "approve") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "draft") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapterWorkflowTasks(safeBookId, safeChapterNo, 20) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapters(safeBookId) }),
    ]);

    if (!completedStage) {
      return;
    }

    const [workflowState, stageData] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: queryKeys.chapterWorkflowState(safeBookId, safeChapterNo),
        queryFn: () => getChapterWorkflowState(safeBookId, safeChapterNo),
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, completedStage),
        queryFn: () => getChapterStage(safeBookId, safeChapterNo, completedStage),
      }),
    ]);

    queryClient.setQueryData(queryKeys.chapterWorkflowState(safeBookId, safeChapterNo), workflowState);
    queryClient.setQueryData(queryKeys.chapterStage(safeBookId, safeChapterNo, completedStage), stageData);
  }, [queryClient, safeBookId, safeChapterNo]);

  // ------ Effects ------

  // Reset workflow state on chapter change
  useEffect(() => {
    setActiveWorkflowTaskId(null);
    setActiveWorkflowTaskType(null);
    setLastCompletedWorkflowTask(null);
    lastWorkflowFeedbackKeyRef.current = null;
    completionInProgressRef.current = false;
    setFeedback({
      kind: "idle",
      title: "等待操作",
      detail: "这里会显示 workflow 与阶段保存的最近动作。",
    });
  }, [bookId, chapterNo]);

  // Auto-adopt a running task from latest-task queries (polling effect)
  useEffect(() => {
    if (activeWorkflowTaskId !== null) {
      return;
    }

    const candidates = [
      latestApproveTaskQuery.data,
      latestRepairTaskQuery.data,
      latestReviewTaskQuery.data,
      latestDraftTaskQuery.data,
      latestPlanTaskQuery.data,
      latestAuthorIntentTaskQuery.data,
    ].filter(Boolean) as WorkflowTaskView[];
    const runningTask = candidates.find((task) => task.status === "pending" || task.status === "running" || task.status === "terminating");
    if (!runningTask) {
      return;
    }

    // Don't re-adopt a "running" task that hasn't reported progress in 10+ minutes.
    const updatedAtMs = new Date(runningTask.updatedAt).getTime();
    if (Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > 10 * 60 * 1000) {
      setFeedback({
        kind: "error",
        title: "检测到陈旧 workflow 任务",
        detail: `任务 #${runningTask.id} 上次更新已超过 10 分钟，请手动重启对应阶段。`,
      });
      return;
    }

    setActiveWorkflowTaskId(runningTask.id);
    setActiveWorkflowTaskType(runningTask.workflowType);
  }, [
    activeWorkflowTaskId,
    latestApproveTaskQuery.data,
    latestRepairTaskQuery.data,
    latestReviewTaskQuery.data,
    latestDraftTaskQuery.data,
    latestPlanTaskQuery.data,
    latestAuthorIntentTaskQuery.data,
  ]);

  // Feedback state effect — update feedback from polled workflowTaskQuery
  useEffect(() => {
    const task = workflowTaskQuery.data;
    if (!task) {
      return;
    }

    // Drop stale poll results from a previously-active chapter
    if (task.bookId !== safeBookId || task.chapterNo !== safeChapterNo) {
      return;
    }

    if (task.status === "pending" || task.status === "running" || task.status === "terminating") {
      const feedbackKey = `${task.status}:${task.workflowType}:${task.stage ?? "queued"}:${task.progressPercent ?? "null"}`;
      if (lastWorkflowFeedbackKeyRef.current === feedbackKey) {
        return;
      }
      lastWorkflowFeedbackKeyRef.current = feedbackKey;
      setFeedback({
        kind: "running",
        title: task.status === "terminating" ? `${task.workflowType} 正在终止` : `正在执行 ${task.workflowType}`,
        detail:
          task.status === "terminating"
            ? `终止请求已提交，当前阶段：${task.stage ?? "queued"}${task.progressPercent != null ? ` · ${task.progressPercent}%` : ""}`
            : `当前阶段：${task.stage ?? "queued"}${task.progressPercent != null ? ` · ${task.progressPercent}%` : ""}`,
      });
      return;
    }

    lastWorkflowFeedbackKeyRef.current = null;
    setLastCompletedWorkflowTask(task);

    if (task.status === "succeeded") {
      if (task.workflowType === "author_intent") {
        const result = task.result as { authorIntent?: string } | null;
        if (typeof result?.authorIntent === "string") {
          setPlanIntentDraft(result.authorIntent);
        }
        void workflowTaskHistoryQuery.refetch();
        void queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "author_intent") });
        setFeedback({
          kind: "success",
          title: "authorIntent 生成完成",
          detail: "已将生成结果回填到输入框，可继续修改后再确认。",
        });
        toast.success("authorIntent 生成完成");
        setActiveWorkflowTaskId(null);
        setActiveWorkflowTaskType(null);
        return;
      }

      if (completionInProgressRef.current) return;
      completionInProgressRef.current = true;
      const snapshot = { bookId: safeBookId, chapterNo: safeChapterNo };
      void (async () => {
        try {
          try {
            await refreshChapter(completedStageByWorkflow[task.workflowType]);
          } catch (error) {
            const cur = currentChapterRef.current;
            if (cur.bookId !== snapshot.bookId || cur.chapterNo !== snapshot.chapterNo) return;
            setLastCompletedWorkflowTask(null);
            setFeedback({
              kind: "error",
              title: `${task.workflowType} 已完成，但阶段刷新失败`,
              detail: formatApiErrorMessage(error, "章节状态与阶段内容刷新失败，请手动刷新后查看最新结果。"),
            });
            toast.error(`${task.workflowType} 已完成，但阶段刷新失败`, {
              description: formatApiErrorMessage(error, "请手动刷新后查看最新结果。"),
            });
            return;
          }

          const cur = currentChapterRef.current;
          if (cur.bookId !== snapshot.bookId || cur.chapterNo !== snapshot.chapterNo) return;
          onWorkflowComplete(task.workflowType);
          setFeedback({
            kind: "success",
            title: `${task.workflowType} 执行完成`,
            detail: "章节状态与阶段内容已刷新。",
          });
          toast.success(`${task.workflowType} 执行完成`);
        } finally {
          const cur = currentChapterRef.current;
          if (cur.bookId === snapshot.bookId && cur.chapterNo === snapshot.chapterNo) {
            setActiveWorkflowTaskId(null);
            setActiveWorkflowTaskType(null);
          }
          completionInProgressRef.current = false;
        }
      })();
      return;
    }

    setFeedback({
      kind: task.status === "terminated" ? "idle" : "error",
      title: task.status === "terminated" ? `${task.workflowType} 已终止` : `${task.workflowType} 执行失败`,
      detail: task.error?.message ?? (task.status === "terminated" ? "任务已按请求停止。" : "Workflow 执行失败"),
    });
    if (task.status !== "terminated") {
      toast.error(`${task.workflowType} 执行失败`, { description: task.error?.message });
    }
    void refreshChapter().catch(() => {});
    setActiveWorkflowTaskId(null);
    setActiveWorkflowTaskType(null);
  }, [workflowTaskQuery.data, safeBookId, safeChapterNo, refreshChapter, onWorkflowComplete]);

  // Refetch task data when switching to the task tab
  useEffect(() => {
    if (activeTab !== "task") {
      return;
    }

    void workflowTaskHistoryQuery.refetch();
    if (activeWorkflowTaskId !== null) {
      void workflowTaskQuery.refetch();
    }
  }, [activeTab, activeWorkflowTaskId]);

  // ------ Mutations ------

  const workflowMutation = useMutation({
    mutationFn: async ({ action, dryRun, authorIntentOverride }: WorkflowRunRequest) => {
      const base = {
        bookId: safeBookId,
        chapterNo: safeChapterNo,
        provider,
        lowModel: lowModel || undefined,
        midModel: midModel || undefined,
        highModel: highModel || undefined,
      };

      if (action === "plan") {
        return startPlanTask({
          ...base,
          authorIntent: authorIntentOverride,
          targetWords: Number(targetWords) || undefined,
          manualEntityRefs,
        });
      }
      if (action === "draft") {
        return startDraftTask({
          ...base,
          targetWords: Number(targetWords) || undefined,
        });
      }
      if (action === "review") {
        return startReviewTask(base);
      }
      if (action === "repair") {
        return startRepairTask(base);
      }
      if (dryRun) {
        return runApprove({ ...base, dryRun });
      }
      return startApproveTask({ ...base, dryRun });
    },
    onMutate: ({ action, dryRun }) => {
      setFeedback({
        kind: "running",
        title: dryRun ? `正在预演 ${action}` : `正在执行 ${action}`,
        detail: action === "plan" ? "会带上当前选中的 manualEntityRefs。" : "请等待 workflow 执行完成。",
      });
    },
    onSuccess: async (result, { action, dryRun }) => {
      if (action === "plan" || action === "draft" || action === "review" || action === "repair" || (action === "approve" && !dryRun)) {
        const task = result as WorkflowTaskView;
        setLastCompletedWorkflowTask(task);
        setActiveWorkflowTaskId(task.id);
        setActiveWorkflowTaskType(task.workflowType);
        setFeedback({
          kind: "running",
          title: `正在执行 ${task.workflowType}`,
          detail: `任务已创建，当前阶段：${task.stage ?? "queued"}`,
        });
        return;
      }

      await refreshChapter();
      setFeedback({
        kind: "success",
        title: dryRun ? `${action} 预演完成` : `${action} 执行完成`,
        detail: dryRun ? "预演完成，尚未正式提交。" : "章节生命周期与阶段内容已刷新。",
      });
      toast.success(dryRun ? `${action} 预演完成` : `${action} 执行完成`);
    },
    onError: (error, { action, dryRun }) => {
      const title = dryRun ? `${action} 预演失败` : `${action} 执行失败`;
      const detail = formatApiErrorMessage(error, "Workflow 执行失败");
      setFeedback({ kind: "error", title, detail });
      toast.error(title, { description: detail });
    },
    onSettled: () => {
      workflowSubmitLockRef.current = false;
    },
  });

  const generateAuthorIntentMutation = useMutation({
    mutationFn: async () =>
      startAuthorIntentTask({
        bookId: safeBookId,
        chapterNo: safeChapterNo,
        provider,
        lowModel: lowModel || undefined,
        midModel: midModel || undefined,
        highModel: highModel || undefined,
        manualEntityRefs,
      }),
    onMutate: () => {
      setFeedback({
        kind: "running",
        title: "正在生成 authorIntent",
        detail: "任务已提交，请等待生成完成。",
      });
    },
    onSuccess: (task) => {
      setLastCompletedWorkflowTask(task);
      setActiveWorkflowTaskId(task.id);
      setActiveWorkflowTaskType(task.workflowType);
      setFeedback({
        kind: "running",
        title: "正在生成 authorIntent",
        detail: `任务已创建，当前阶段：${task.stage ?? "queued"}`,
      });
    },
    onError: (error) => {
      const detail = formatApiErrorMessage(error, "生成 authorIntent 失败");
      setFeedback({
        kind: "error",
        title: "authorIntent 生成失败",
        detail,
      });
      toast.error("authorIntent 生成失败", { description: detail });
    },
  });

  const terminateWorkflowTaskMutation = useMutation({
    mutationFn: async (taskId: number) => terminateWorkflowTask(taskId),
    onMutate: () => {
      setFeedback({
        kind: "running",
        title: "正在请求终止任务",
        detail: "任务会在当前步骤安全结束后停止。",
      });
    },
    onSuccess: async (task) => {
      setActiveWorkflowTaskId(task.status === "terminated" ? null : task.id);
      setActiveWorkflowTaskType(task.status === "terminated" ? null : task.workflowType);
      setLastCompletedWorkflowTask((current) => (task.status === "terminated" ? task : current));
      await Promise.all([
        workflowTaskHistoryQuery.refetch(),
        ...(activeWorkflowTaskId !== null ? [workflowTaskQuery.refetch()] : []),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "author_intent") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "plan") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "draft") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "review") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "repair") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.latestChapterWorkflowTask(safeBookId, safeChapterNo, "approve") }),
      ]);
      setFeedback({
        kind: task.status === "terminated" ? "idle" : "running",
        title: task.status === "terminated" ? "任务已终止" : "已请求终止任务",
        detail: task.status === "terminated" ? "任务已停止。" : "任务会在当前步骤结束后尽快停止。",
      });
    },
    onError: (error) => {
      const detail = formatApiErrorMessage(error, "终止任务失败");
      setFeedback({
        kind: "error",
        title: "终止任务失败",
        detail,
      });
      toast.error("终止任务失败", { description: detail });
    },
  });

  // ------ Derived helpers ------

  const tryStartWorkflow = (request: WorkflowRunRequest) => {
    if (workflowSubmitLockRef.current || workflowMutation.isPending || activeWorkflowTaskType !== null) {
      return;
    }
    workflowSubmitLockRef.current = true;
    workflowMutation.mutate(request);
  };

  const isAnyWorkflowBusy = activeWorkflowTaskType !== null || workflowMutation.isPending;

  return {
    // state
    activeWorkflowTaskId,
    activeWorkflowTaskType,
    lastCompletedWorkflowTask,
    feedback,
    setFeedback,
    planIntentDialogMode,
    setPlanIntentDialogMode,
    planIntentDraft,
    setPlanIntentDraft,
    workflowSubmitLockRef,

    // queries
    workflowStateQuery,
    latestAuthorIntentTaskQuery,
    latestPlanTaskQuery,
    latestDraftTaskQuery,
    latestReviewTaskQuery,
    latestRepairTaskQuery,
    latestApproveTaskQuery,
    workflowTaskQuery,
    workflowTaskHistoryQuery,

    // mutations
    workflowMutation,
    generateAuthorIntentMutation,
    terminateWorkflowTaskMutation,

    // actions
    tryStartWorkflow,
    refreshChapter,

    // derived
    isAnyWorkflowBusy,
  };
}
