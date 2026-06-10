import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { formatApiErrorMessage } from "@/lib/api";
import { deleteBook, getBook, updateBook } from "@/lib/books-api";
import { createChapter, deleteChapter, listChapters, updateChapter } from "@/lib/chapters-api";
import { queryKeys } from "@/lib/query/query-keys";
import { bookReaderPath, chapterWorkbenchPath, parseBookId } from "@/lib/routes";
import { getUserRuntimeSettings } from "@/lib/user-settings-api";
import {
  listCharacters,
  listFactions,
  listItems,
  listStoryHooks,
  listWorldSettings,
} from "@/lib/resources-api";
import type { BookView, ChapterView, CreateChapterInput, UpdateChapterInput, WorkflowBaseInput } from "@/lib/types";
import { formatIdList, parseIdList } from "@/lib/utils";

const chapterStatuses = ["todo", "planned", "drafted", "reviewed", "repaired", "approved"] as const;
type WorkflowProvider = NonNullable<WorkflowBaseInput["provider"]>;
type ChapterCreateWorkflowProvider = WorkflowProvider | "default";

type ResourceOption = {
  id: number;
  name: string;
  subtitle?: string | null;
};

type ChapterEditForm = {
  title: string;
  summary: string;
  targetWordCount: string;
  status: string;
  actualCharacterIds: number[];
  actualFactionIds: number[];
  actualItemIds: number[];
  actualHookIds: number[];
  actualWorldSettingIds: number[];
};

type CreateChapterForm = {
  chapterNo: string;
  title: string;
  targetWordCount: string;
  status: string;
  provider: ChapterCreateWorkflowProvider;
  lowModel: string;
  midModel: string;
  highModel: string;
};

function formatStageState(chapter: Pick<ChapterView, "currentPlanId" | "currentDraftId" | "currentReviewId" | "currentFinalId">) {
  return [
    chapter.currentPlanId ? "Plan" : null,
    chapter.currentDraftId ? "Draft" : null,
    chapter.currentReviewId ? "Review" : null,
    chapter.currentFinalId ? "Final" : null,
  ].filter(Boolean);
}

function createDraftChapterForm(chapterNo?: number, defaults?: Partial<Pick<CreateChapterForm, "provider" | "lowModel" | "midModel" | "highModel">>): CreateChapterForm {
  return {
    chapterNo: chapterNo ? String(chapterNo) : "",
    title: "",
    targetWordCount: "",
    status: "todo",
    provider: defaults?.provider ?? "default",
    lowModel: defaults?.lowModel ?? "",
    midModel: defaults?.midModel ?? "",
    highModel: defaults?.highModel ?? "",
  };
}

function createBookForm(book?: BookView | null) {
  return {
    title: book?.title ?? "",
    summary: book?.summary ?? "",
    targetChapterCount: book?.targetChapterCount ? String(book.targetChapterCount) : "",
    status: book?.status ?? "drafting",
  };
}

function createEditChapterForm(chapter: ChapterView): ChapterEditForm {
  return {
    title: chapter.title ?? "",
    summary: chapter.summary ?? "",
    targetWordCount: chapter.targetWordCount ? String(chapter.targetWordCount) : "",
    status: chapter.status,
    actualCharacterIds: parseIdList(chapter.actualCharacterIds),
    actualFactionIds: parseIdList(chapter.actualFactionIds),
    actualItemIds: parseIdList(chapter.actualItemIds),
    actualHookIds: parseIdList(chapter.actualHookIds),
    actualWorldSettingIds: parseIdList(chapter.actualWorldSettingIds),
  };
}

function ResourceSelectionGroup(props: {
  title: string;
  options: ResourceOption[];
  selectedIds: number[];
  onToggle: (resourceId: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{props.title}</div>
        <div className="text-xs text-muted-foreground">已选 {props.selectedIds.length}</div>
      </div>
      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
        {props.options.length === 0 && <div className="text-xs text-muted-foreground">当前没有可选资源。</div>}
        {props.options.map((option) => {
          const checked = props.selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`block cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => props.onToggle(option.id)}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{option.name}</div>
                  {option.subtitle ? <div className="mt-1 text-[11px] text-muted-foreground">{option.subtitle}</div> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function BookDashboardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bookId = parseBookId(params.bookId);
  const safeBookId = bookId ?? 0;

  const [bookForm, setBookForm] = useState(() => createBookForm());
  const [createForm, setCreateForm] = useState(() => createDraftChapterForm());
  const previousSuggestedChapterNoRef = useRef<number | null>(null);
  const lastHydratedCreateDefaultsRef = useRef<string | null>(null);
  const [editingChapterNo, setEditingChapterNo] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ChapterEditForm>({
    title: "",
    summary: "",
    targetWordCount: "",
    status: "todo",
    actualCharacterIds: [],
    actualFactionIds: [],
    actualItemIds: [],
    actualHookIds: [],
    actualWorldSettingIds: [],
  });

  const bookQuery = useQuery({
    queryKey: queryKeys.book(safeBookId),
    queryFn: () => getBook(safeBookId),
    enabled: bookId !== null,
  });

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chapters(safeBookId),
    queryFn: () => listChapters(safeBookId),
    enabled: bookId !== null,
  });

  const charactersQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "characters"),
    queryFn: () => listCharacters(safeBookId),
    enabled: bookId !== null,
  });

  const factionsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "factions"),
    queryFn: () => listFactions(safeBookId),
    enabled: bookId !== null,
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "items"),
    queryFn: () => listItems(safeBookId),
    enabled: bookId !== null,
  });

  const hooksQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "hooks"),
    queryFn: () => listStoryHooks(safeBookId),
    enabled: bookId !== null,
  });

  const worldSettingsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "worldSettings"),
    queryFn: () => listWorldSettings(safeBookId),
    enabled: bookId !== null,
  });
  const userRuntimeSettingsQuery = useQuery({
    queryKey: queryKeys.userRuntimeSettings(),
    queryFn: () => getUserRuntimeSettings(),
  });

  const book = bookQuery.data;
  const createFormDefaults = useMemo(
    () => ({
      provider: "default" as const,
      lowModel: userRuntimeSettingsQuery.data?.effective.lowModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
      midModel: userRuntimeSettingsQuery.data?.effective.midModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
      highModel: userRuntimeSettingsQuery.data?.effective.highModel ?? userRuntimeSettingsQuery.data?.effective.model ?? "",
    }),
    [userRuntimeSettingsQuery.data],
  );
  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((left, right) => left.chapterNo - right.chapterNo),
    [chaptersQuery.data],
  );
  const nextChapterNo = useMemo(() => {
    if (!chaptersQuery.data) {
      return null;
    }
    const maxChapterNo = chapters.reduce((currentMax, chapter) => Math.max(currentMax, chapter.chapterNo), 0);
    return maxChapterNo + 1;
  }, [chapters, chaptersQuery.data]);

  useEffect(() => {
    setBookForm(createBookForm(book));
  }, [book?.id, book?.title, book?.summary, book?.targetChapterCount, book?.status]);

  useEffect(() => {
    if (nextChapterNo == null) {
      return;
    }

    setCreateForm((current) => {
      if (!current.chapterNo.trim() || current.chapterNo === String(previousSuggestedChapterNoRef.current)) {
        return {
          ...current,
          chapterNo: String(nextChapterNo),
        };
      }
      return current;
    });
    previousSuggestedChapterNoRef.current = nextChapterNo;
  }, [nextChapterNo]);

  useEffect(() => {
    const defaultsKey = JSON.stringify(createFormDefaults);
    if (lastHydratedCreateDefaultsRef.current === defaultsKey) {
      return;
    }

    setCreateForm((current) => {
      if (
        current.provider !== "default"
        || current.lowModel.trim().length > 0
        || current.midModel.trim().length > 0
        || current.highModel.trim().length > 0
      ) {
        return current;
      }

      return {
        ...current,
        provider: createFormDefaults.provider,
        lowModel: createFormDefaults.lowModel,
        midModel: createFormDefaults.midModel,
        highModel: createFormDefaults.highModel,
      };
    });
    lastHydratedCreateDefaultsRef.current = defaultsKey;
  }, [createFormDefaults]);

  const refreshBookContext = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.books() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.book(safeBookId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chapters(safeBookId) }),
    ]);
  };

  const createChapterMutation = useMutation({
    mutationFn: (input: CreateChapterInput) => createChapter(safeBookId, input),
    onSuccess: async (chapter) => {
      await refreshBookContext();
      navigate(chapterWorkbenchPath(safeBookId, chapter.chapterNo), {
        state: {
          provider: createForm.provider === "default" ? undefined : createForm.provider,
          lowModel: createForm.lowModel.trim() || undefined,
          midModel: createForm.midModel.trim() || undefined,
          highModel: createForm.highModel.trim() || undefined,
        },
      });
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: () =>
      updateBook(safeBookId, {
        title: bookForm.title.trim(),
        summary: bookForm.summary.trim() || undefined,
        targetChapterCount: bookForm.targetChapterCount ? Number(bookForm.targetChapterCount) : undefined,
        status: bookForm.status.trim() || undefined,
      }),
    onSuccess: async () => {
      await refreshBookContext();
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: () => deleteBook(safeBookId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.books() });
      navigate("/app");
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: ({ chapterNo, input }: { chapterNo: number; input: UpdateChapterInput }) =>
      updateChapter(safeBookId, chapterNo, input),
    onSuccess: async () => {
      await refreshBookContext();
      setEditingChapterNo(null);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (chapterNo: number) => deleteChapter(safeBookId, chapterNo),
    onSuccess: async () => {
      await refreshBookContext();
      setEditingChapterNo(null);
    },
  });

  const characterOptions = useMemo<ResourceOption[]>(
    () =>
      (charactersQuery.data ?? []).map((character) => ({
        id: character.id,
        name: character.name,
        subtitle: character.status,
      })),
    [charactersQuery.data],
  );

  const factionOptions = useMemo<ResourceOption[]>(
    () =>
      (factionsQuery.data ?? []).map((faction) => ({
        id: faction.id,
        name: faction.name,
        subtitle: faction.category ?? faction.status,
      })),
    [factionsQuery.data],
  );

  const itemOptions = useMemo<ResourceOption[]>(
    () =>
      (itemsQuery.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        subtitle: item.category ?? item.status,
      })),
    [itemsQuery.data],
  );

  const hookOptions = useMemo<ResourceOption[]>(
    () =>
      (hooksQuery.data ?? []).map((hook) => ({
        id: hook.id,
        name: hook.title,
        subtitle: hook.status,
      })),
    [hooksQuery.data],
  );

  const worldSettingOptions = useMemo<ResourceOption[]>(
    () =>
      (worldSettingsQuery.data ?? []).map((worldSetting) => ({
        id: worldSetting.id,
        name: worldSetting.title,
        subtitle: worldSetting.category,
      })),
    [worldSettingsQuery.data],
  );

  const submitCreate = () => {
    const chapterNo = Number(createForm.chapterNo);
    if (!Number.isInteger(chapterNo) || chapterNo <= 0) {
      return;
    }

    createChapterMutation.mutate({
      chapterNo,
      title: createForm.title.trim() || null,
      targetWordCount: createForm.targetWordCount ? Number(createForm.targetWordCount) : null,
      status: createForm.status,
    });
  };

  const startEditChapter = (chapter: ChapterView) => {
    setEditingChapterNo(chapter.chapterNo);
    setEditForm(createEditChapterForm(chapter));
  };

  const toggleChapterResource = (key: keyof Pick<ChapterEditForm, "actualCharacterIds" | "actualFactionIds" | "actualItemIds" | "actualHookIds" | "actualWorldSettingIds">, resourceId: number) => {
    setEditForm((current) => ({
      ...current,
      [key]: current[key].includes(resourceId)
        ? current[key].filter((id) => id !== resourceId)
        : [...current[key], resourceId],
    }));
  };

  const submitEdit = () => {
    if (editingChapterNo === null) {
      return;
    }

    updateChapterMutation.mutate({
      chapterNo: editingChapterNo,
      input: {
        title: editForm.title.trim() || null,
        summary: editForm.summary.trim() || null,
        targetWordCount: editForm.targetWordCount ? Number(editForm.targetWordCount) : null,
        status: editForm.status,
        actualCharacterIds: formatIdList(editForm.actualCharacterIds),
        actualFactionIds: formatIdList(editForm.actualFactionIds),
        actualItemIds: formatIdList(editForm.actualItemIds),
        actualHookIds: formatIdList(editForm.actualHookIds),
        actualWorldSettingIds: formatIdList(editForm.actualWorldSettingIds),
      },
    });
  };

  const confirmDeleteBook = () => {
    if (!window.confirm(`确定删除《${book?.title ?? "当前书籍"}》吗？此操作不可撤销。`)) {
      return;
    }
    deleteBookMutation.mutate();
  };

  const confirmDeleteChapter = (chapterNo: number) => {
    if (!window.confirm(`确定删除第 ${chapterNo} 章吗？此操作不可撤销。`)) {
      return;
    }
    deleteChapterMutation.mutate(chapterNo);
  };

  if (bookId === null) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
        URL 中的书籍编号无效，请回到书籍总览重新进入。
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-header p-6 text-primary-foreground">
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative">
        <p className="text-sm text-primary-foreground/70">单书总控面板</p>
        <h2 className="mt-2 text-2xl font-semibold">{book?.title ?? "书籍工作台"}</h2>
        <div className="mt-4 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-3 backdrop-blur-sm">
          <div className="max-h-56 overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-primary-foreground/80">
              {book?.summary || "这里会展示书籍信息、章节列表、资源概览与最近活跃章节。"}
            </p>
          </div>
        </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">章节创建</h3>
                <p className="mt-1 text-sm text-muted-foreground">直接在 WebUI 内创建章节并进入对应工作台。</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>章节号</span>
                <Input
                  value={createForm.chapterNo}
                  onChange={(event) => setCreateForm((current) => ({ ...current, chapterNo: event.target.value }))}
                  inputMode="numeric"
                  placeholder="例如 12"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>目标字数</span>
                <Input
                  value={createForm.targetWordCount}
                  onChange={(event) => setCreateForm((current) => ({ ...current, targetWordCount: event.target.value }))}
                  inputMode="numeric"
                  placeholder="例如 3000"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>Provider</span>
                <Select value={createForm.provider} onChange={(event) => setCreateForm((current) => ({ ...current, provider: event.target.value as ChapterCreateWorkflowProvider }))}>
                  <option value="default">跟随个人默认</option>
                  <option value="mock">mock</option>
                  <option value="openai">openai</option>
                  <option value="anthropic">anthropic</option>
                  <option value="custom">custom</option>
                </Select>
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>Low Model</span>
                <Input
                  value={createForm.lowModel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, lowModel: event.target.value }))}
                  placeholder="留空则沿用个人默认"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>Mid Model</span>
                <Input
                  value={createForm.midModel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, midModel: event.target.value }))}
                  placeholder="留空则沿用个人默认"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>High Model</span>
                <Input
                  value={createForm.highModel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, highModel: event.target.value }))}
                  placeholder="留空则沿用个人默认"
                />
              </label>
              <label className="col-span-2 space-y-2 text-sm text-muted-foreground">
                <span>章节标题</span>
                <Input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="例如：风雪夜归人"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">建议下一章编号：第 {nextChapterNo ?? "—"} 章</div>
              <Button
                onClick={submitCreate}
                disabled={createChapterMutation.isPending}
              >
                {createChapterMutation.isPending ? "创建中..." : "创建并进入工作台"}
              </Button>
            </div>

            {createChapterMutation.isError && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>
                  {formatApiErrorMessage(createChapterMutation.error, "创建章节失败")}
                </AlertDescription>
              </Alert>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">章节列表</h3>
                <p className="mt-1 text-sm text-muted-foreground">按章节查看当前生命周期进度，并可直接进入编辑与阅读入口。</p>
              </div>
              <Badge variant="secondary">共 {chapters.length} 章</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {chaptersQuery.isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              )}
              {chapters.map((chapter) => {
                const stageBadges = formatStageState(chapter);
                const isEditing = chapter.chapterNo === editingChapterNo;
                return (
                  <div key={chapter.id} className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-foreground">第 {chapter.chapterNo} 章</span>
                          {chapter.title && <span className="text-sm text-muted-foreground">· {chapter.title}</span>}
                          <Badge>{chapter.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {stageBadges.length > 0 ? (
                            stageBadges.map((stage) => (
                              <Badge key={stage} variant="success">
                                {stage}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="warning">暂无阶段产物</Badge>
                          )}
                          <Badge variant="secondary">
                            更新于 {new Date(chapter.updatedAt).toLocaleString("zh-CN")}
                          </Badge>
                        </div>
                        {chapter.summary && <p className="max-w-3xl text-sm text-muted-foreground">{chapter.summary}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild>
                          <Link to={chapterWorkbenchPath(safeBookId, chapter.chapterNo)}>
                            进入工作台
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => startEditChapter(chapter)}
                        >
                          <PencilLine className="h-4 w-4" />
                          编辑元信息
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => confirmDeleteChapter(chapter.chapterNo)}
                          disabled={deleteChapterMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除章节
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm text-muted-foreground md:col-span-2">
                          <span>章节标题</span>
                          <Input
                            value={editForm.title}
                            onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                          />
                        </label>
                        <label className="space-y-2 text-sm text-muted-foreground">
                          <span>章节状态</span>
                          <Select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                            {chapterStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <label className="space-y-2 text-sm text-muted-foreground">
                          <span>目标字数</span>
                          <Input
                            value={editForm.targetWordCount}
                            onChange={(event) => setEditForm((current) => ({ ...current, targetWordCount: event.target.value }))}
                            inputMode="numeric"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-muted-foreground md:col-span-2">
                          <span>章节摘要</span>
                          <Textarea
                            className="min-h-24"
                            value={editForm.summary}
                            onChange={(event) => setEditForm((current) => ({ ...current, summary: event.target.value }))}
                          />
                        </label>

                        <div className="space-y-3 md:col-span-2">
                          <div>
                            <h4 className="text-sm font-medium text-foreground">章节实际关联资源</h4>
                            <p className="mt-1 text-xs text-muted-foreground">这些选择会写回 chapter 的 `actual_*` 字段，保持与现有 HTTP contract 一致。</p>
                          </div>
                          <div className="grid gap-3 xl:grid-cols-2">
                            <ResourceSelectionGroup
                              title="角色"
                              options={characterOptions}
                              selectedIds={editForm.actualCharacterIds}
                              onToggle={(id) => toggleChapterResource("actualCharacterIds", id)}
                            />
                            <ResourceSelectionGroup
                              title="势力"
                              options={factionOptions}
                              selectedIds={editForm.actualFactionIds}
                              onToggle={(id) => toggleChapterResource("actualFactionIds", id)}
                            />
                            <ResourceSelectionGroup
                              title="物品"
                              options={itemOptions}
                              selectedIds={editForm.actualItemIds}
                              onToggle={(id) => toggleChapterResource("actualItemIds", id)}
                            />
                            <ResourceSelectionGroup
                              title="钩子"
                              options={hookOptions}
                              selectedIds={editForm.actualHookIds}
                              onToggle={(id) => toggleChapterResource("actualHookIds", id)}
                            />
                            <div className="xl:col-span-2">
                              <ResourceSelectionGroup
                                title="世界设定"
                                options={worldSettingOptions}
                                selectedIds={editForm.actualWorldSettingIds}
                                onToggle={(id) => toggleChapterResource("actualWorldSettingIds", id)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
                          <div className="text-sm text-muted-foreground">
                            {chapter.currentFinalId ? "已产生成稿，可直接前往阅读页查看。" : "当前仍处于写作流程中。"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {chapter.currentFinalId && (
                              <Button asChild variant="ghost" className="text-success">
                                <Link to={bookReaderPath(safeBookId)}>
                                  前往阅读页
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              onClick={() => setEditingChapterNo(null)}
                            >
                              取消
                            </Button>
                            <Button
                              onClick={submitEdit}
                              disabled={updateChapterMutation.isPending}
                            >
                              {updateChapterMutation.isPending ? "保存中..." : "保存章节信息"}
                            </Button>
                          </div>
                        </div>
                        {(updateChapterMutation.isError || deleteChapterMutation.isError) && (
                          <Alert variant="destructive" className="md:col-span-2">
                            <AlertDescription>
                              {updateChapterMutation.isError
                                ? formatApiErrorMessage(updateChapterMutation.error, "更新章节失败")
                                : formatApiErrorMessage(deleteChapterMutation.error, "删除章节失败")}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!chaptersQuery.isLoading && chapters.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  这本书还没有章节，直接使用上方表单即可创建第一章。
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">书籍编辑</h3>
                <p className="mt-1 text-sm text-muted-foreground">直接修改标题、简介、目标章节数与当前状态。</p>
              </div>
              <Button
                variant="ghost"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={confirmDeleteBook}
                disabled={deleteBookMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                删除书籍
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>书籍标题</span>
                <Input
                  value={bookForm.title}
                  onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>书籍状态</span>
                <Input
                  value={bookForm.status}
                  onChange={(event) => setBookForm((current) => ({ ...current, status: event.target.value }))}
                  placeholder="例如 drafting / ongoing / completed"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>目标章节数</span>
                <Input
                  value={bookForm.targetChapterCount}
                  onChange={(event) => setBookForm((current) => ({ ...current, targetChapterCount: event.target.value }))}
                  inputMode="numeric"
                  placeholder="例如 100"
                />
              </label>
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>书籍简介</span>
                <Textarea
                  className="min-h-28"
                  value={bookForm.summary}
                  onChange={(event) => setBookForm((current) => ({ ...current, summary: event.target.value }))}
                />
              </label>
              <Button
                className="w-full"
                onClick={() => updateBookMutation.mutate()}
                disabled={updateBookMutation.isPending || !bookForm.title.trim()}
              >
                {updateBookMutation.isPending ? "保存中..." : "保存书籍信息"}
              </Button>
              {(updateBookMutation.isError || deleteBookMutation.isError) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {updateBookMutation.isError
                      ? formatApiErrorMessage(updateBookMutation.error, "更新书籍失败")
                      : formatApiErrorMessage(deleteBookMutation.error, "删除书籍失败")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-foreground">书籍概览</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">目标章节</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{book?.targetChapterCount ?? "—"}</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">已批准</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{book?.currentChapterCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">状态</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{book?.status ?? "—"}</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">最近更新</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{book?.updatedAt ? new Date(book.updatedAt).toLocaleString("zh-CN") : "—"}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
