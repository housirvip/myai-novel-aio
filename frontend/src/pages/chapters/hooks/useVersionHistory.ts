import { useState } from "react";

import type { ChapterStage, ChapterStageHistoryEntry } from "@/lib/types";

import type { StageTab } from "./types";

const historyLimitOptions = [10, 20, 50] as const;
export type HistoryLimitOption = (typeof historyLimitOptions)[number];

function getDiffPreview(
  current: ChapterStageHistoryEntry | undefined,
  previous: ChapterStageHistoryEntry | undefined,
) {
  if (!current) {
    return null;
  }

  if (!previous) {
    return {
      summary: "这是当前阶段的首个版本。",
      addedLines: current.content
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .slice(0, 6),
      removedLines: [] as string[],
    };
  }

  const currentLines = current.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const previousLines = previous.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const previousSet = new Set(previousLines);
  const currentSet = new Set(currentLines);

  return {
    summary: `对比 v${previous.versionNo} → v${current.versionNo}`,
    addedLines: currentLines.filter((line) => !previousSet.has(line)).slice(0, 6),
    removedLines: previousLines.filter((line) => !currentSet.has(line)).slice(0, 6),
  };
}

export function useVersionHistory(_activeTab: StageTab) {
  const [historyLimit, setHistoryLimit] = useState<HistoryLimitOption>(10);
  const [selectedHistoryIdByStage, setSelectedHistoryIdByStage] = useState<
    Partial<Record<ChapterStage, number>>
  >({});
  const [historyComparisonIdsByStage, setHistoryComparisonIdsByStage] = useState<
    Partial<Record<ChapterStage, number[]>>
  >({});
  const [historyContentExpanded, setHistoryContentExpanded] = useState(false);
  const [historyDiffDialogOpen, setHistoryDiffDialogOpen] = useState(false);

  return {
    historyLimit,
    setHistoryLimit,
    selectedHistoryIdByStage,
    setSelectedHistoryIdByStage,
    historyComparisonIdsByStage,
    setHistoryComparisonIdsByStage,
    historyContentExpanded,
    setHistoryContentExpanded,
    historyDiffDialogOpen,
    setHistoryDiffDialogOpen,
    getDiffPreview,
    historyLimitOptions,
  };
}
