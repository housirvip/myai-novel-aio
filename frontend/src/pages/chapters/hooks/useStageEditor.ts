import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getChapterStage,
  listChapterStageHistory,
  updateChapterStage,
} from "@/lib/chapters-api";
import { formatApiErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query/query-keys";
import { generateStageSummary } from "@/lib/workflows-api";
import type { ChapterStage } from "@/lib/types";

import type { FeedbackState, StageTab } from "./types";

type StageAvailability = Record<ChapterStage, boolean>;

export function useStageEditor(params: {
  bookId: number | null;
  chapterNo: number | null;
  activeTab: StageTab;
  setActiveTab: (tab: StageTab) => void;
  stageAvailability: StageAvailability;
  setFeedback: (feedback: FeedbackState) => void;
  historyLimit: number;
  provider: "mock" | "openai" | "anthropic" | "custom";
  lowModel: string;
  midModel: string;
  highModel: string;
  refreshChapter: () => Promise<void>;
}) {
  const {
    bookId,
    chapterNo,
    activeTab,
    stageAvailability,
    historyLimit,
    setFeedback,
    provider,
    lowModel,
    midModel,
    highModel,
    refreshChapter,
  } = params;
  const safeBookId = bookId ?? 0;
  const safeChapterNo = chapterNo ?? 0;
  const enabled = bookId !== null && chapterNo !== null;

  const [editorContent, setEditorContent] = useState("");
  const [editorSummary, setEditorSummary] = useState("");
  const previousActiveTabRef = useRef<StageTab>("plan");
  const lastHydratedStageRef = useRef<{
    tab: StageTab;
    content: string;
    summary: string;
  } | null>(null);

  // --- stage data queries ---
  const stageQueries = {
    plan: useQuery({
      queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "plan"),
      queryFn: () => getChapterStage(safeBookId, safeChapterNo, "plan"),
      enabled: enabled && stageAvailability.plan,
    }),
    draft: useQuery({
      queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "draft"),
      queryFn: () => getChapterStage(safeBookId, safeChapterNo, "draft"),
      enabled: enabled && stageAvailability.draft,
    }),
    review: useQuery({
      queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "review"),
      queryFn: () => getChapterStage(safeBookId, safeChapterNo, "review"),
      enabled: enabled && stageAvailability.review,
    }),
    final: useQuery({
      queryKey: queryKeys.chapterStage(safeBookId, safeChapterNo, "final"),
      queryFn: () => getChapterStage(safeBookId, safeChapterNo, "final"),
      enabled: enabled && stageAvailability.final,
    }),
  };

  // --- history queries ---
  const historyQueries = {
    plan: useQuery({
      queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "plan", historyLimit),
      queryFn: () => listChapterStageHistory(safeBookId, safeChapterNo, "plan", historyLimit),
      enabled: enabled && stageAvailability.plan,
    }),
    draft: useQuery({
      queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "draft", historyLimit),
      queryFn: () => listChapterStageHistory(safeBookId, safeChapterNo, "draft", historyLimit),
      enabled: enabled && stageAvailability.draft,
    }),
    review: useQuery({
      queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "review", historyLimit),
      queryFn: () => listChapterStageHistory(safeBookId, safeChapterNo, "review", historyLimit),
      enabled: enabled && stageAvailability.review,
    }),
    final: useQuery({
      queryKey: queryKeys.chapterStageHistory(safeBookId, safeChapterNo, "final", historyLimit),
      queryFn: () => listChapterStageHistory(safeBookId, safeChapterNo, "final", historyLimit),
      enabled: enabled && stageAvailability.final,
    }),
  };

  // --- derived state ---
  const activeStageKey = activeTab === "task" ? null : activeTab;
  const activeStageData = activeStageKey ? stageQueries[activeStageKey].data : null;
  const stageIsEditable = activeStageKey !== null && activeStageKey !== "review";
  const loadedSummary = activeStageData?.summary ?? "";
  const loadedContent = activeStageData?.content ?? "";
  const isDirty =
    stageIsEditable && (editorSummary !== loadedSummary || editorContent !== loadedContent);

  // --- hydrate editor when tab changes or data loads ---
  useEffect(() => {
    const switchedTab = previousActiveTabRef.current !== activeTab;
    previousActiveTabRef.current = activeTab;

    if (!activeStageData) {
      lastHydratedStageRef.current = null;
      setEditorContent("");
      setEditorSummary("");
      return;
    }

    const nextStageState = {
      tab: activeTab,
      content: activeStageData.content,
      summary: activeStageData.summary ?? "",
    };
    const lastHydratedStage = lastHydratedStageRef.current;
    const firstLoadForStage =
      lastHydratedStage == null ||
      lastHydratedStage.tab !== activeTab;

    const serverVersionChanged =
      lastHydratedStage != null &&
      lastHydratedStage.tab === activeTab &&
      (lastHydratedStage.content !== nextStageState.content ||
       lastHydratedStage.summary !== nextStageState.summary);

    if (!switchedTab && !firstLoadForStage && !serverVersionChanged && isDirty) {
      return;
    }

    lastHydratedStageRef.current = nextStageState;
    setEditorContent(nextStageState.content);
    setEditorSummary(nextStageState.summary);
  }, [
    activeStageData?.content,
    activeStageData?.summary,
    activeTab,
    isDirty,
  ]);

  // --- dirty tracking / beforeunload ---
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // --- save mutation ---
  const saveStageMutation = useMutation({
    mutationFn: async () => {
      if (!stageIsEditable || !activeStageKey) {
        return null;
      }

      return updateChapterStage(safeBookId, safeChapterNo, activeStageKey, {
        content: editorContent,
        summary: editorSummary || null,
      });
    },
    onMutate: () => {
      setFeedback({
        kind: "running",
        title: `正在保存 ${activeStageKey ?? activeTab}`,
        detail: "保存会创建新版本并刷新 current pointer。",
      });
    },
    onSuccess: async () => {
      await refreshChapter();
      setFeedback({
        kind: "success",
        title: `${activeStageKey ?? activeTab} 保存成功`,
        detail: "最新内容已落库并刷新到当前章节状态。",
      });
      toast.success(`${activeStageKey ?? activeTab} 保存成功`);
    },
    onError: (error) => {
      const detail = formatApiErrorMessage(error, "阶段保存失败");
      setFeedback({
        kind: "error",
        title: `${activeStageKey ?? activeTab} 保存失败`,
        detail,
      });
      toast.error(`${activeStageKey ?? activeTab} 保存失败`, { description: detail });
    },
  });

  // --- generate summary mutation ---
  const generateStageSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!stageIsEditable || !activeStageKey) {
        throw new Error("当前阶段不支持生成摘要。");
      }
      return generateStageSummary({
        bookId: safeBookId,
        chapterNo: safeChapterNo,
        stage: activeStageKey,
        content: editorContent,
        provider,
        lowModel: lowModel || undefined,
        midModel: midModel || undefined,
        highModel: highModel || undefined,
      });
    },
    onSuccess: (result) => {
      setEditorSummary(result.summary);
      setFeedback({
        kind: "success",
        title: "阶段摘要生成完成",
        detail: "已将生成结果回填到摘要输入框，保存后才会写入当前阶段版本。",
      });
      toast.success("阶段摘要生成完成");
    },
    onError: (error) => {
      const detail = formatApiErrorMessage(error, "生成阶段摘要失败");
      setFeedback({
        kind: "error",
        title: "阶段摘要生成失败",
        detail,
      });
      toast.error("阶段摘要生成失败", { description: detail });
    },
  });

  return {
    editorContent,
    setEditorContent,
    editorSummary,
    setEditorSummary,
    stageDataByStage: stageQueries,
    stageHistoryByStage: historyQueries,
    saveStageMutation,
    generateStageSummaryMutation,
    isDirty,
    activeStageKey,
    activeStageData,
    stageIsEditable,
  };
}
