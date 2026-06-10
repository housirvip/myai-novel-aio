import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { InlineResourceEditor } from "./components/InlineResourceEditor";
import { PlanIntentDialog } from "./components/PlanIntentDialog";
import { ResourceSelectionGroup } from "./components/ResourceSelectionGroup";
import { StageActionBar } from "./components/StageActionBar";
import { StageSnapshot } from "./components/StageSnapshot";
import { TaskHistoryPanel } from "./components/TaskHistoryPanel";
import { VersionDiffDialog } from "./components/VersionDiffDialog";
import { VersionHistoryPanel } from "./components/VersionHistoryPanel";
import { WorkflowPipeline } from "./components/WorkflowPipeline";
import { WorkflowSettingsDialog } from "./components/WorkflowSettingsDialog";
import { WorkflowStatusCard } from "./components/WorkflowStatusCard";
import { getWorkflowStatusCardViewModel } from "./components/workbench-utils";
import {
  useWorkflowSettings,
  useWorkflowEngine,
  useStageEditor,
  useVersionHistory,
  useResourceSelection,
  useWorkbenchShortcuts,
  emptyManualEntityRefs,
  loadStoredWorkflowSettings,
  getWorkflowSettingsStorageKey,
  type StageTab,
  type ManualEntityRefs,
  type WorkflowAction,
  type ChapterWorkbenchLocationState,
} from "./hooks";

import {
  buildResourceFormFromItem,
  type EditableResourceKey,
} from "@/components/resources/resource-editor-shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getChapter, listChapters } from "@/lib/chapters-api";
import { queryKeys } from "@/lib/query/query-keys";
import { chapterWorkbenchPath, parseBookId, parseChapterNo } from "@/lib/routes";
import type { ChapterStage, ChapterStageHistoryEntry, WorkflowTaskType } from "@/lib/types";

function formatActionLabel(action: string) {
  return action.replaceAll("_", " ");
}

function getStageWordCount(content: string) {
  return content.replace(/\s+/g, "").length;
}

type PendingConfirm = { kind: "tab"; tab: StageTab } | { kind: "chapter"; chapterNo: number } | { kind: "rerun-plan" } | null;

export function ChapterWorkbenchPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookId = parseBookId(params.bookId);
  const chapterNo = parseChapterNo(params.chapterNo);
  const safeBookId = bookId ?? 0;
  const safeChapterNo = chapterNo ?? 0;
  const workflowPreset = (location.state as ChapterWorkbenchLocationState | null) ?? null;

  const validTabs: StageTab[] = ["plan", "draft", "review", "final", "task"];
  const urlTab = searchParams.get("tab") as StageTab | null;
  const [activeTab, setActiveTabState] = useState<StageTab>(
    urlTab && validTabs.includes(urlTab) ? urlTab : "plan",
  );
  const setActiveTab = useCallback((tab: StageTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const urlTab = searchParams.get("tab") as StageTab | null;
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [searchParams]);
  const [selectedWorkflowTaskId, setSelectedWorkflowTaskId] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  // ── Core queries ──────────────────────────────────────────────────
  const chapterQuery = useQuery({
    queryKey: queryKeys.chapter(safeBookId, safeChapterNo),
    queryFn: () => getChapter(safeBookId, safeChapterNo),
    enabled: bookId !== null && chapterNo !== null,
  });

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chapters(safeBookId),
    queryFn: () => listChapters(safeBookId),
    enabled: bookId !== null,
  });

  // ── Hooks ─────────────────────────────────────────────────────────
  const settings = useWorkflowSettings(bookId, chapterNo, workflowPreset);

  const versionHistory = useVersionHistory(activeTab);

  const resources = useResourceSelection({
    bookId,
    chapterNo,
    chapterData: chapterQuery.data,
    chaptersData: chaptersQuery.data,
  });

  const onWorkflowComplete = useCallback(
    (workflowType: WorkflowTaskType) => {
      const tabMap: Record<string, StageTab> = {
        plan: "plan",
        draft: "draft",
        review: "review",
        repair: "draft",
        approve: "final",
      };
      const nextTab = tabMap[workflowType];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    },
    [setActiveTab],
  );

  const workflow = useWorkflowEngine({
    bookId,
    chapterNo,
    provider: settings.provider,
    lowModel: settings.lowModel,
    midModel: settings.midModel,
    highModel: settings.highModel,
    targetWords: settings.targetWords,
    manualEntityRefs: resources.manualEntityRefs,
    activeTab,
    onWorkflowComplete,
  });

  const workflowStageAvailability = {
    plan: workflow.workflowStateQuery.data?.hasPlan ?? false,
    draft: workflow.workflowStateQuery.data?.hasDraft ?? false,
    review: workflow.workflowStateQuery.data?.hasReview ?? false,
    final: workflow.workflowStateQuery.data?.hasFinal ?? false,
  } satisfies Record<ChapterStage, boolean>;

  const editor = useStageEditor({
    bookId,
    chapterNo,
    activeTab,
    setActiveTab,
    stageAvailability: workflowStageAvailability,
    setFeedback: workflow.setFeedback,
    historyLimit: versionHistory.historyLimit,
    provider: settings.provider,
    lowModel: settings.lowModel,
    midModel: settings.midModel,
    highModel: settings.highModel,
    refreshChapter: workflow.refreshChapter,
  });

  // ── Derived state ─────────────────────────────────────────────────
  const availableActions = (workflow.workflowStateQuery.data?.availableActions ?? []) as WorkflowAction[];
  const activeStageWordCount = editor.activeStageData ? getStageWordCount(editor.activeStageData.content) : null;
  const editorWordCount = editor.editorContent ? getStageWordCount(editor.editorContent) : 0;

  const activeHistory = editor.activeStageKey ? (editor.stageHistoryByStage[editor.activeStageKey].data ?? []) : [];
  const selectedHistoryId = editor.activeStageKey ? versionHistory.selectedHistoryIdByStage[editor.activeStageKey] : undefined;
  const selectedHistory = activeHistory.find((entry) => entry.id === selectedHistoryId) ?? activeHistory[0];
  const activeComparisonIds = editor.activeStageKey ? (versionHistory.historyComparisonIdsByStage[editor.activeStageKey] ?? []) : [];
  const comparisonEntries = activeComparisonIds
    .map((entryId) => activeHistory.find((entry) => entry.id === entryId))
    .filter((entry): entry is ChapterStageHistoryEntry => Boolean(entry))
    .sort((left, right) => activeHistory.findIndex((entry) => entry.id === left.id) - activeHistory.findIndex((entry) => entry.id === right.id));
  const comparisonCurrent = comparisonEntries[0];
  const comparisonPrevious = comparisonEntries[1];
  const comparisonDiffPreview = comparisonEntries.length === 2 ? versionHistory.getDiffPreview(comparisonCurrent, comparisonPrevious) : null;

  const workflowTaskHistory = workflow.workflowTaskHistoryQuery.data ?? [];
  const selectedWorkflowTask = workflowTaskHistory.find((task) => task.id === selectedWorkflowTaskId) ?? workflowTaskHistory[0] ?? null;
  const displayedWorkflowTask = workflow.workflowTaskQuery.data ?? workflow.lastCompletedWorkflowTask;
  const workflowStatusCard = getWorkflowStatusCardViewModel(displayedWorkflowTask, workflow.feedback);
  const taskDetailCard = getWorkflowStatusCardViewModel(selectedWorkflowTask, workflow.feedback);

  const currentChapterIndex = resources.chapterList.findIndex((chapter) => chapter.chapterNo === chapterNo);
  const previousChapter = currentChapterIndex > 0 ? resources.chapterList[currentChapterIndex - 1] ?? null : null;
  const nextChapter = currentChapterIndex >= 0 ? resources.chapterList[currentChapterIndex + 1] ?? null : null;

  const activeAuthorIntentTask =
    workflow.workflowTaskQuery.data && workflow.workflowTaskQuery.data.workflowType === "author_intent"
      ? workflow.workflowTaskQuery.data
      : workflow.activeWorkflowTaskType === "author_intent" && workflow.lastCompletedWorkflowTask?.workflowType === "author_intent"
        ? workflow.lastCompletedWorkflowTask
        : null;

  const isContentStage = activeTab === "draft" || activeTab === "final";

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useWorkbenchShortcuts({
    onSave: () => editor.saveStageMutation.mutate(),
    canSave: editor.stageIsEditable && !!editor.editorContent.trim() && !workflow.isAnyWorkflowBusy && !editor.saveStageMutation.isPending,
  });

  // ── Effects ───────────────────────────────────────────────────────

  useEffect(() => {
    const firstTask = workflowTaskHistory[0] ?? null;
    if (!firstTask) {
      if (selectedWorkflowTaskId !== null) {
        setSelectedWorkflowTaskId(null);
      }
      return;
    }

    if (workflow.activeWorkflowTaskId !== null) {
      const runningTask = workflowTaskHistory.find((task) => task.id === workflow.activeWorkflowTaskId);
      if (runningTask && (runningTask.status === "pending" || runningTask.status === "running" || runningTask.status === "terminating")) {
        if (selectedWorkflowTaskId !== runningTask.id) {
          setSelectedWorkflowTaskId(runningTask.id);
        }
        return;
      }
    }

    if (selectedWorkflowTaskId) {
      const stillExists = workflowTaskHistory.some((task) => task.id === selectedWorkflowTaskId);
      if (stillExists) {
        return;
      }
    }

    setSelectedWorkflowTaskId(firstTask.id);
  }, [workflowTaskHistory, workflow.activeWorkflowTaskId, selectedWorkflowTaskId]);

  useEffect(() => {
    versionHistory.setHistoryContentExpanded(false);
  }, [activeTab, selectedHistory?.id, selectedWorkflowTask?.id]);

  useEffect(() => {
    if (!editor.activeStageKey) {
      return;
    }

    const firstEntry = activeHistory[0];
    if (!firstEntry) {
      return;
    }

    versionHistory.setSelectedHistoryIdByStage((current) => {
      if (current[editor.activeStageKey!]) {
        const stillExists = activeHistory.some((entry) => entry.id === current[editor.activeStageKey!]);
        if (stillExists) {
          return current;
        }
      }

      return {
        ...current,
        [editor.activeStageKey!]: firstEntry.id,
      };
    });
  }, [activeHistory, editor.activeStageKey]);

  useEffect(() => {
    if (!editor.activeStageKey) {
      versionHistory.setHistoryDiffDialogOpen(false);
      return;
    }

    versionHistory.setHistoryComparisonIdsByStage((current) => {
      const existing = current[editor.activeStageKey!] ?? [];
      if (existing.length === 0) {
        return current;
      }

      const filtered = existing.filter((entryId) => activeHistory.some((entry) => entry.id === entryId));
      if (filtered.length === existing.length) {
        return current;
      }

      return {
        ...current,
        [editor.activeStageKey!]: filtered,
      };
    });
  }, [activeHistory, editor.activeStageKey]);

  useEffect(() => {
    if (comparisonEntries.length !== 2 && versionHistory.historyDiffDialogOpen) {
      versionHistory.setHistoryDiffDialogOpen(false);
    }
  }, [comparisonEntries.length, versionHistory.historyDiffDialogOpen]);

  // ── Handlers ──────────────────────────────────────────────────────

  const switchTab = (nextTab: StageTab) => {
    if (nextTab === activeTab) {
      return;
    }

    if (editor.isDirty) {
      setPendingConfirm({ kind: "tab", tab: nextTab });
      return;
    }

    setActiveTab(nextTab);
  };

  const navigateToChapter = (targetChapterNo: number | null | undefined) => {
    if (!targetChapterNo) {
      return;
    }

    if (editor.isDirty) {
      setPendingConfirm({ kind: "chapter", chapterNo: targetChapterNo });
      return;
    }

    navigate(chapterWorkbenchPath(safeBookId, targetChapterNo));
  };

  const toggleManualRef = (key: keyof ManualEntityRefs, resourceId: number) => {
    resources.setManualEntityRefs((current) => ({
      ...current,
      [key]: current[key].includes(resourceId)
        ? current[key].filter((id) => id !== resourceId)
        : [...current[key], resourceId],
    }));
  };

  const toggleHistoryComparison = (entryId: number) => {
    if (!editor.activeStageKey) {
      return;
    }

    versionHistory.setHistoryComparisonIdsByStage((current) => {
      const existing = current[editor.activeStageKey!] ?? [];
      const isSelected = existing.includes(entryId);

      if (isSelected) {
        versionHistory.setHistoryDiffDialogOpen(false);
        return {
          ...current,
          [editor.activeStageKey!]: existing.filter((id) => id !== entryId),
        };
      }

      if (existing.length >= 2) {
        return current;
      }

      return {
        ...current,
        [editor.activeStageKey!]: [...existing, entryId],
      };
    });
  };

  const clearHistoryComparison = () => {
    if (!editor.activeStageKey) {
      return;
    }

    versionHistory.setHistoryDiffDialogOpen(false);
    versionHistory.setHistoryComparisonIdsByStage((current) => ({
      ...current,
      [editor.activeStageKey!]: [],
    }));
  };

  const openHistoryDiffDialog = () => {
    if (comparisonEntries.length !== 2) {
      return;
    }
    versionHistory.setHistoryDiffDialogOpen(true);
  };

  const closeHistoryDiffDialog = () => {
    versionHistory.setHistoryDiffDialogOpen(false);
  };

  const openResourceEditor = (resourceType: EditableResourceKey, resourceId: number) => {
    const resource = resources.editableResourceMap[resourceType].get(resourceId);
    if (!resource) {
      workflow.setFeedback({
        kind: "error",
        title: "资源加载失败",
        detail: "没有找到要编辑的实体，请稍后重试。",
      });
      return;
    }

    resources.setResourceEditor({ resourceType, resourceId });
    resources.setResourceEditorForm(buildResourceFormFromItem(resourceType, resource));
  };

  const closeResourceEditor = () => {
    resources.setResourceEditor(null);
  };

  const openWorkflowSettingsDialog = () => {
    settings.setWorkflowSettingsDraft({
      provider: settings.provider,
      lowModel: settings.lowModel,
      midModel: settings.midModel,
      highModel: settings.highModel,
      targetWords: settings.targetWords,
    });
    settings.setWorkflowSettingsDialogOpen(true);
  };

  const closeWorkflowSettingsDialog = () => {
    settings.setWorkflowSettingsDialogOpen(false);
    settings.setWorkflowSettingsDraft({
      provider: settings.provider,
      lowModel: settings.lowModel,
      midModel: settings.midModel,
      highModel: settings.highModel,
      targetWords: settings.targetWords,
    });
  };

  const saveWorkflowSettings = () => {
    settings.setProvider(settings.workflowSettingsDraft.provider);
    settings.setLowModel(settings.workflowSettingsDraft.lowModel);
    settings.setMidModel(settings.workflowSettingsDraft.midModel);
    settings.setHighModel(settings.workflowSettingsDraft.highModel);
    settings.setTargetWords(settings.workflowSettingsDraft.targetWords);
    settings.setWorkflowSettingsDialogOpen(false);
  };

  const clearWorkflowModelOverrides = () => {
    const resetSettings = loadStoredWorkflowSettings(safeBookId, safeChapterNo, workflowPreset, settings.runtimeWorkflowDefaults);
    const clearedSettings = {
      ...resetSettings,
      provider: settings.runtimeWorkflowDefaults.provider,
      lowModel: settings.runtimeWorkflowDefaults.lowModel,
      midModel: settings.runtimeWorkflowDefaults.midModel,
      highModel: settings.runtimeWorkflowDefaults.highModel,
    };

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getWorkflowSettingsStorageKey(safeBookId, safeChapterNo));
    }

    settings.setProvider(clearedSettings.provider);
    settings.setLowModel(clearedSettings.lowModel);
    settings.setMidModel(clearedSettings.midModel);
    settings.setHighModel(clearedSettings.highModel);
    settings.setTargetWords(clearedSettings.targetWords);
    settings.setWorkflowSettingsDraft(clearedSettings);
    workflow.setFeedback({
      kind: "success",
      title: "已清除章节模型覆盖",
      detail: "当前章节已回退到用户默认的 low / mid / high 模型设置。",
    });
  };

  const closePlanIntentDialog = () => {
    workflow.generateAuthorIntentMutation.reset();
    workflow.setPlanIntentDialogMode(null);
    workflow.setPlanIntentDraft("");
  };

  const openInitialPlanDialog = () => {
    workflow.generateAuthorIntentMutation.reset();
    workflow.setPlanIntentDraft("");
    workflow.setPlanIntentDialogMode("initial");
  };

  const openReplanDialog = () => {
    workflow.generateAuthorIntentMutation.reset();
    workflow.setPlanIntentDraft("");
    workflow.setPlanIntentDialogMode("replan");
  };

  const rerunPlan = () => {
    if (editor.isDirty) {
      setPendingConfirm({ kind: "rerun-plan" });
      return;
    }

    openReplanDialog();
  };

  const confirmPendingAction = () => {
    const pending = pendingConfirm;
    if (!pending) {
      return;
    }

    if (pending.kind === "tab") {
      setActiveTab(pending.tab);
    } else if (pending.kind === "chapter") {
      navigate(chapterWorkbenchPath(safeBookId, pending.chapterNo));
    } else {
      openReplanDialog();
    }

    setPendingConfirm(null);
  };

  const pendingConfirmCopy = pendingConfirm?.kind === "tab"
    ? {
        title: "切换标签",
        description: "当前阶段内容尚未保存，确定切换标签吗？",
        confirmLabel: "切换",
        destructive: false,
      }
    : pendingConfirm?.kind === "chapter"
      ? {
          title: "切换章节",
          description: "当前阶段内容尚未保存，确定切换到其他章节吗？",
          confirmLabel: "切换",
          destructive: false,
        }
      : pendingConfirm?.kind === "rerun-plan"
        ? {
            title: "重新 plan",
            description: "当前 plan 尚未保存，确定重新 plan 吗？",
            confirmLabel: "重新 plan",
            destructive: true,
          }
        : null;

  const confirmPlanIntent = () => {
    if (!workflow.planIntentDialogMode) {
      return;
    }
    if (workflow.workflowSubmitLockRef.current || workflow.workflowMutation.isPending || workflow.activeWorkflowTaskType !== null) {
      return;
    }
    workflow.workflowSubmitLockRef.current = true;
    workflow.workflowMutation.mutate({
      action: "plan",
      authorIntentOverride: workflow.planIntentDraft.trim() || undefined,
    });
    closePlanIntentDialog();
  };

  // ── Render ────────────────────────────────────────────────────────

  if (bookId === null || chapterNo === null) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
        URL 中的书籍编号或章节号无效，请回到对应书籍工作台重新进入。
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* ── Sidebar ── */}
      <aside className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">章节与上下文</h2>

        {/* Chapter navigation */}
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm font-medium text-foreground">章节切换</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigateToChapter(previousChapter?.chapterNo)}
              disabled={!previousChapter}
              className="justify-center text-muted-foreground"
            >
              {previousChapter ? `上一章 · ${previousChapter.chapterNo}` : "没有上一章"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigateToChapter(nextChapter?.chapterNo)}
              disabled={!nextChapter}
              className="justify-center text-muted-foreground"
            >
              {nextChapter ? `下一章 · ${nextChapter.chapterNo}` : "没有下一章"}
            </Button>
          </div>
        </div>

        {/* Chapter info */}
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm font-medium text-foreground">
            第 {chapterNo} 章 {chapterQuery.data?.title ? `· ${chapterQuery.data.title}` : ""}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">状态：{workflow.workflowStateQuery.data?.status ?? chapterQuery.data?.status ?? "加载中"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <span key={action} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
                {formatActionLabel(action)}
              </span>
            ))}
          </div>
        </div>

        {/* Workflow settings */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-semibold text-foreground">Workflow 参数</div>
          <p className="mt-1 text-xs text-muted-foreground">
            个人默认配置在设置页维护；这里的 provider、模型与目标字数只覆盖当前章节当前这次运行。
          </p>
          <div className="mt-4 grid gap-2 text-xs">
            {[
              { label: "Provider", value: settings.provider },
              { label: "Low Model", value: settings.lowModel || "未设置" },
              { label: "Mid Model", value: settings.midModel || "未设置" },
              { label: "High Model", value: settings.highModel || "未设置" },
              { label: "Target Words", value: settings.targetWords || "未设置" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={clearWorkflowModelOverrides}>
              清除模型覆盖
            </Button>
            <Button type="button" size="sm" onClick={openWorkflowSettingsDialog}>
              修改
            </Button>
          </div>
        </div>

        {/* Entity refs selector */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex flex-nowrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">manualEntityRefs 选择器</div>
              <div className="mt-1 text-xs text-muted-foreground">进入章节时会默认勾选当前已关联资源；plan 检索会优先带上这里当前勾选的资源。</div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => resources.setManualEntityRefs(emptyManualEntityRefs)} className="shrink-0">
              清空
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            <ResourceSelectionGroup
              title="角色"
              options={resources.characterOptions}
              selectedIds={resources.manualEntityRefs.characterIds}
              onToggle={(id) => toggleManualRef("characterIds", id)}
              onEdit={(id) => openResourceEditor("characters", id)}
            />
            <ResourceSelectionGroup
              title="势力"
              options={resources.factionOptions}
              selectedIds={resources.manualEntityRefs.factionIds}
              onToggle={(id) => toggleManualRef("factionIds", id)}
              onEdit={(id) => openResourceEditor("factions", id)}
            />
            <ResourceSelectionGroup
              title="物品"
              options={resources.itemOptions}
              selectedIds={resources.manualEntityRefs.itemIds}
              onToggle={(id) => toggleManualRef("itemIds", id)}
              onEdit={(id) => openResourceEditor("items", id)}
            />
            <ResourceSelectionGroup
              title="钩子"
              options={resources.hookOptions}
              selectedIds={resources.manualEntityRefs.hookIds}
              onToggle={(id) => toggleManualRef("hookIds", id)}
              onEdit={(id) => openResourceEditor("hooks", id)}
            />
            <ResourceSelectionGroup
              title="关系"
              options={resources.relationOptions}
              selectedIds={resources.manualEntityRefs.relationIds}
              onToggle={(id) => toggleManualRef("relationIds", id)}
              onEdit={(id) => openResourceEditor("relations", id)}
            />
            <ResourceSelectionGroup
              title="世界设定"
              options={resources.worldSettingOptions}
              selectedIds={resources.manualEntityRefs.worldSettingIds}
              onToggle={(id) => toggleManualRef("worldSettingIds", id)}
              onEdit={(id) => openResourceEditor("worldSettings", id)}
            />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Stage 工作区</h2>
            <p className="mt-1 text-sm text-muted-foreground">围绕当前章节的 plan / draft / review / final 进行编辑、查看与保存。</p>
          </div>
        </div>

        <WorkflowPipeline
          activeTab={activeTab}
          stageAvailability={workflowStageAvailability}
          onSwitchTab={switchTab}
          isDirty={editor.isDirty}
        />

        {editor.activeStageKey ? (
          <>
            <StageSnapshot
              stageData={editor.activeStageData ?? null}
              stageKey={editor.activeStageKey}
              wordCount={activeStageWordCount}
              isLoading={editor.stageDataByStage[editor.activeStageKey].isLoading}
              isError={editor.stageDataByStage[editor.activeStageKey].isError}
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="text-xs text-muted-foreground">阶段摘要（可选）</div>
                {editor.stageIsEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editor.generateStageSummaryMutation.mutate()}
                    disabled={editor.generateStageSummaryMutation.isPending || !editor.editorContent.trim() || workflow.isAnyWorkflowBusy}
                    className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    {editor.generateStageSummaryMutation.isPending ? "生成摘要中..." : "AI 生成摘要"}
                  </Button>
                )}
              </div>
              <Textarea
                value={editor.editorSummary}
                onChange={(event) => editor.setEditorSummary(event.target.value)}
                disabled={!editor.stageIsEditable}
                placeholder="阶段摘要（可选）"
                className="min-h-24 bg-card"
              />
            </div>
            <div className="relative">
              <Textarea
                value={editor.editorContent}
                onChange={(event) => editor.setEditorContent(event.target.value)}
                disabled={!editor.stageIsEditable}
                placeholder="阶段正文内容"
                className={`min-h-[420px] bg-card px-5 py-4 text-base leading-[1.85] ${isContentStage ? "font-serif" : ""}`}
              />
              <div className="flex items-center justify-between rounded-b-xl border-x border-b border-border bg-muted px-4 py-1.5 -mt-2 text-[11px] text-muted-foreground">
                <span>字数：{editorWordCount}</span>
                <span>{editor.activeStageKey.toUpperCase()} · {editor.stageIsEditable ? "可编辑" : "只读"}</span>
              </div>
            </div>

            <StageActionBar
              activeTab={activeTab}
              activeStageKey={editor.activeStageKey}
              stageIsEditable={editor.stageIsEditable}
              availableActions={availableActions}
              isAnyWorkflowBusy={workflow.isAnyWorkflowBusy}
              workflowMutationPending={workflow.workflowMutation.isPending}
              workflowMutationAction={workflow.workflowMutation.variables?.action}
              activeWorkflowTaskType={workflow.activeWorkflowTaskType}
              saveStageMutationPending={editor.saveStageMutation.isPending}
              editorContentEmpty={!editor.editorContent.trim()}
              isDirty={editor.isDirty}
              onOpenInitialPlanDialog={openInitialPlanDialog}
              onStartWorkflow={workflow.tryStartWorkflow}
              onRerunPlan={rerunPlan}
              onSaveStage={() => editor.saveStageMutation.mutate()}
            />

            <WorkflowStatusCard card={workflowStatusCard} />

            <VersionHistoryPanel
              activeStageKey={editor.activeStageKey}
              historyEntries={activeHistory}
              isLoading={editor.stageHistoryByStage[editor.activeStageKey].isLoading}
              historyLimit={versionHistory.historyLimit}
              historyLimitOptions={versionHistory.historyLimitOptions}
              onHistoryLimitChange={(limit) => versionHistory.setHistoryLimit(limit as 10 | 20 | 50)}
              selectedHistory={selectedHistory ?? null}
              onSelectHistory={(id) =>
                versionHistory.setSelectedHistoryIdByStage((current) => ({
                  ...current,
                  [editor.activeStageKey!]: id,
                }))
              }
              comparisonIds={activeComparisonIds}
              onToggleComparison={toggleHistoryComparison}
              onClearComparison={clearHistoryComparison}
              onOpenDiffDialog={openHistoryDiffDialog}
              comparisonEntries={comparisonEntries}
              historyContentExpanded={versionHistory.historyContentExpanded}
              onToggleContentExpanded={() => versionHistory.setHistoryContentExpanded((current) => !current)}
            />
          </>
        ) : (
          <TaskHistoryPanel
            tasks={workflowTaskHistory}
            isLoading={workflow.workflowTaskHistoryQuery.isLoading}
            selectedTask={selectedWorkflowTask}
            onSelectTask={(id) => setSelectedWorkflowTaskId(id)}
            taskDetailCard={taskDetailCard}
            onTerminateTask={(taskId) => workflow.terminateWorkflowTaskMutation.mutate(taskId)}
            terminatePending={workflow.terminateWorkflowTaskMutation.isPending}
          />
        )}
      </Card>

      {pendingConfirmCopy && (
        <ConfirmDialog
          open={pendingConfirm !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingConfirm(null);
            }
          }}
          title={pendingConfirmCopy.title}
          description={pendingConfirmCopy.description}
          confirmLabel={pendingConfirmCopy.confirmLabel}
          destructive={pendingConfirmCopy.destructive}
          onConfirm={confirmPendingAction}
        />
      )}
      <VersionDiffDialog
        open={versionHistory.historyDiffDialogOpen}
        diffPreview={comparisonDiffPreview}
        onClose={closeHistoryDiffDialog}
        onClearComparison={clearHistoryComparison}
      />

      {resources.resourceEditor && (
        <InlineResourceEditor
          resourceType={resources.resourceEditor.resourceType}
          resourceId={resources.resourceEditor.resourceId}
          form={resources.resourceEditorForm}
          setForm={resources.setResourceEditorForm}
          pickerSources={resources.pickerSources}
          onSave={() => resources.saveResourceMutation.mutate()}
          onClose={closeResourceEditor}
          isSaving={resources.saveResourceMutation.isPending}
          saveError={resources.saveResourceMutation.isError ? resources.saveResourceMutation.error : null}
        />
      )}

      <WorkflowSettingsDialog
        open={settings.workflowSettingsDialogOpen}
        draft={settings.workflowSettingsDraft}
        onDraftChange={settings.setWorkflowSettingsDraft}
        onSave={saveWorkflowSettings}
        onCancel={closeWorkflowSettingsDialog}
      />

      <PlanIntentDialog
        mode={workflow.planIntentDialogMode}
        intentDraft={workflow.planIntentDraft}
        onIntentDraftChange={workflow.setPlanIntentDraft}
        manualEntityRefs={resources.manualEntityRefs}
        onConfirm={confirmPlanIntent}
        onCancel={closePlanIntentDialog}
        onGenerateAuthorIntent={() => workflow.generateAuthorIntentMutation.mutate()}
        generateAuthorIntentPending={workflow.generateAuthorIntentMutation.isPending}
        isAnyWorkflowBusy={workflow.isAnyWorkflowBusy}
        workflowMutationPending={workflow.workflowMutation.isPending}
        activeAuthorIntentTask={activeAuthorIntentTask}
        onTerminateTask={(taskId) => workflow.terminateWorkflowTaskMutation.mutate(taskId)}
        terminatePending={workflow.terminateWorkflowTaskMutation.isPending}
      />
    </section>
  );
}
