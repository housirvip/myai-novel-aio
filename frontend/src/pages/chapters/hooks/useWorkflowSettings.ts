import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getUserRuntimeSettings } from "@/lib/user-settings-api";
import { queryKeys } from "@/lib/query/query-keys";
import type { PlanWorkflowInput } from "@/lib/types";

export type WorkflowProvider = NonNullable<PlanWorkflowInput["provider"]>;
export type WorkflowModelOverrides = {
  lowModel: string;
  midModel: string;
  highModel: string;
};
export type ChapterWorkbenchLocationState = {
  provider?: WorkflowProvider;
  lowModel?: string;
  midModel?: string;
  highModel?: string;
};
export type StoredWorkflowSettings = WorkflowModelOverrides & {
  provider: WorkflowProvider;
  targetWords: string;
};

export function getWorkflowSettingsStorageKey(bookIdValue: number, chapterNoValue: number) {
  return `chapter-workbench-workflow-settings:${bookIdValue}:${chapterNoValue}`;
}

export function loadStoredWorkflowSettings(
  bookIdValue: number,
  chapterNoValue: number,
  preset: ChapterWorkbenchLocationState | null,
  userDefaults?: { provider: WorkflowProvider } & WorkflowModelOverrides,
): StoredWorkflowSettings {
  const fallback: StoredWorkflowSettings = {
    provider: preset?.provider ?? userDefaults?.provider ?? "mock",
    lowModel: preset?.lowModel ?? userDefaults?.lowModel ?? "",
    midModel: preset?.midModel ?? userDefaults?.midModel ?? "",
    highModel: preset?.highModel ?? userDefaults?.highModel ?? "",
    targetWords: "3000",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(getWorkflowSettingsStorageKey(bookIdValue, chapterNoValue));
  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredWorkflowSettings>;
    return {
      provider: parsed.provider ?? fallback.provider,
      lowModel: typeof parsed.lowModel === "string" && parsed.lowModel.trim().length > 0 ? parsed.lowModel : fallback.lowModel,
      midModel: typeof parsed.midModel === "string" && parsed.midModel.trim().length > 0 ? parsed.midModel : fallback.midModel,
      highModel: typeof parsed.highModel === "string" && parsed.highModel.trim().length > 0 ? parsed.highModel : fallback.highModel,
      targetWords: typeof parsed.targetWords === "string" ? parsed.targetWords : fallback.targetWords,
    };
  } catch {
    return fallback;
  }
}

export function useWorkflowSettings(bookId: number | null, chapterNo: number | null, locationPreset: ChapterWorkbenchLocationState | null) {
  const safeBookId = bookId ?? 0;
  const safeChapterNo = chapterNo ?? 0;

  const workflowPresetProvider = locationPreset?.provider;
  const workflowPresetLowModel = locationPreset?.lowModel;
  const workflowPresetMidModel = locationPreset?.midModel;
  const workflowPresetHighModel = locationPreset?.highModel;

  const userRuntimeSettingsQuery = useQuery({
    queryKey: queryKeys.userRuntimeSettings(),
    queryFn: () => getUserRuntimeSettings(),
  });

  const runtimeWorkflowDefaults = useMemo(
    () => ({
      provider: userRuntimeSettingsQuery.data?.effective.provider ?? "mock",
      lowModel: userRuntimeSettingsQuery.data?.effective.lowModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
      midModel: userRuntimeSettingsQuery.data?.effective.midModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
      highModel: userRuntimeSettingsQuery.data?.effective.highModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
    }),
    [userRuntimeSettingsQuery.data],
  );

  const initialWorkflowSettings = useMemo(
    () => loadStoredWorkflowSettings(safeBookId, safeChapterNo, locationPreset, runtimeWorkflowDefaults),
    [bookId, chapterNo, workflowPresetProvider, workflowPresetLowModel, workflowPresetMidModel, workflowPresetHighModel, runtimeWorkflowDefaults],
  );

  const [provider, setProvider] = useState<WorkflowProvider>(initialWorkflowSettings.provider);
  const [lowModel, setLowModel] = useState(initialWorkflowSettings.lowModel);
  const [midModel, setMidModel] = useState(initialWorkflowSettings.midModel);
  const [highModel, setHighModel] = useState(initialWorkflowSettings.highModel);
  const [targetWords, setTargetWords] = useState(initialWorkflowSettings.targetWords);
  const [workflowSettingsDialogOpen, setWorkflowSettingsDialogOpen] = useState(false);
  const [workflowSettingsDraft, setWorkflowSettingsDraft] = useState<StoredWorkflowSettings>({
    provider: initialWorkflowSettings.provider,
    lowModel: initialWorkflowSettings.lowModel,
    midModel: initialWorkflowSettings.midModel,
    highModel: initialWorkflowSettings.highModel,
    targetWords: initialWorkflowSettings.targetWords,
  });

  // Sync settings from initialWorkflowSettings when chapter/preset/defaults change
  useEffect(() => {
    const nextSettings = loadStoredWorkflowSettings(safeBookId, safeChapterNo, locationPreset, runtimeWorkflowDefaults);
    setProvider(nextSettings.provider);
    setLowModel(nextSettings.lowModel);
    setMidModel(nextSettings.midModel);
    setHighModel(nextSettings.highModel);
    setTargetWords(nextSettings.targetWords);
    setWorkflowSettingsDraft(nextSettings);
  }, [bookId, chapterNo, workflowPresetProvider, workflowPresetLowModel, workflowPresetMidModel, workflowPresetHighModel, runtimeWorkflowDefaults]);

  // Persist settings to localStorage
  useEffect(() => {
    if (bookId === null || chapterNo === null || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getWorkflowSettingsStorageKey(safeBookId, safeChapterNo),
      JSON.stringify({ provider, lowModel, midModel, highModel, targetWords }),
    );
  }, [bookId, chapterNo, highModel, lowModel, midModel, provider, targetWords]);

  return {
    provider,
    setProvider,
    lowModel,
    setLowModel,
    midModel,
    setMidModel,
    highModel,
    setHighModel,
    targetWords,
    setTargetWords,
    workflowSettingsDialogOpen,
    setWorkflowSettingsDialogOpen,
    workflowSettingsDraft,
    setWorkflowSettingsDraft,
    runtimeWorkflowDefaults,
  };
}
