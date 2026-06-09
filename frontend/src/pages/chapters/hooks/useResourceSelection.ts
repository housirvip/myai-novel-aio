import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildResourceSavePayload,
  getResourceFormValidationMessage,
  saveResourceRecord,
  type EditableResourceKey,
  type EditableResourceRecord,
  type PickerSources,
  type ResourceEditorFormState,
} from "@/components/resources/resource-editor-shared";
import { queryKeys } from "@/lib/query/query-keys";
import {
  listCharacters,
  listFactions,
  listItems,
  listRelations,
  listStoryHooks,
  listWorldSettings,
} from "@/lib/resources-api";
import type {
  ChapterView,
  CharacterView,
  FactionView,
  ItemView,
  RelationView,
  StoryHookView,
  WorldSettingView,
} from "@/lib/types";
import { parseIdList } from "@/lib/utils";

import type { ManualEntityRefs } from "./types";

export type ResourceOption = {
  id: number;
  name: string;
  subtitle?: string | null;
};

export type ResourceEditorState = {
  resourceType: EditableResourceKey;
  resourceId: number;
};

export const emptyManualEntityRefs: ManualEntityRefs = {
  characterIds: [],
  factionIds: [],
  itemIds: [],
  hookIds: [],
  relationIds: [],
  worldSettingIds: [],
};

function getRelationEntityLabel(
  entityType: string,
  entityId: number,
  names: {
    characterNameMap: Map<number, string>;
    factionNameMap: Map<number, string>;
    itemNameMap: Map<number, string>;
    hookNameMap: Map<number, string>;
    worldSettingNameMap: Map<number, string>;
  },
) {
  if (entityType === "character") {
    return names.characterNameMap.get(entityId) ?? `角色#${entityId}`;
  }
  if (entityType === "faction") {
    return names.factionNameMap.get(entityId) ?? `势力#${entityId}`;
  }
  if (entityType === "item") {
    return names.itemNameMap.get(entityId) ?? `物品#${entityId}`;
  }
  if (entityType === "hook") {
    return names.hookNameMap.get(entityId) ?? `钩子#${entityId}`;
  }
  return names.worldSettingNameMap.get(entityId) ?? `世界设定#${entityId}`;
}

export function useResourceSelection(params: {
  bookId: number | null;
  chapterNo: number | null;
  chapterData: ChapterView | undefined;
  chaptersData: ChapterView[] | undefined;
}) {
  const { bookId, chapterNo, chapterData, chaptersData } = params;
  const queryClient = useQueryClient();
  const safeBookId = bookId ?? 0;
  const enabled = bookId !== null;

  // ── State ──────────────────────────────────────────────────────────
  const hydratedManualEntityRefsKeyRef = useRef<string | null>(null);
  const [manualEntityRefs, setManualEntityRefs] = useState<ManualEntityRefs>(emptyManualEntityRefs);
  const [resourceEditor, setResourceEditor] = useState<ResourceEditorState | null>(null);
  const [resourceEditorForm, setResourceEditorForm] = useState<ResourceEditorFormState>({});

  // ── Resource queries ───────────────────────────────────────────────
  const charactersQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "characters"),
    queryFn: () => listCharacters(safeBookId),
    enabled,
  });

  const factionsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "factions"),
    queryFn: () => listFactions(safeBookId),
    enabled,
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "items"),
    queryFn: () => listItems(safeBookId),
    enabled,
  });

  const hooksQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "hooks"),
    queryFn: () => listStoryHooks(safeBookId),
    enabled,
  });

  const relationsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "relations"),
    queryFn: () => listRelations(safeBookId),
    enabled,
  });

  const worldSettingsQuery = useQuery({
    queryKey: queryKeys.resourceList(safeBookId, "worldSettings"),
    queryFn: () => listWorldSettings(safeBookId),
    enabled,
  });

  // ── Derived data (useMemo) ─────────────────────────────────────────
  const chapterList = useMemo(
    () => [...(chaptersData ?? [])].sort((left, right) => left.chapterNo - right.chapterNo),
    [chaptersData],
  );

  const characterOptions = useMemo<ResourceOption[]>(
    () =>
      (charactersQuery.data ?? []).map((character: CharacterView) => ({
        id: character.id,
        name: character.name,
        subtitle: character.status,
      })),
    [charactersQuery.data],
  );

  const factionOptions = useMemo<ResourceOption[]>(
    () =>
      (factionsQuery.data ?? []).map((faction: FactionView) => ({
        id: faction.id,
        name: faction.name,
        subtitle: faction.category ?? faction.status,
      })),
    [factionsQuery.data],
  );

  const itemOptions = useMemo<ResourceOption[]>(
    () =>
      (itemsQuery.data ?? []).map((item: ItemView) => ({
        id: item.id,
        name: item.name,
        subtitle: item.category ?? item.status,
      })),
    [itemsQuery.data],
  );

  const hookOptions = useMemo<ResourceOption[]>(
    () =>
      (hooksQuery.data ?? []).map((hook: StoryHookView) => ({
        id: hook.id,
        name: hook.title,
        subtitle: hook.status,
      })),
    [hooksQuery.data],
  );

  const worldSettingOptions = useMemo<ResourceOption[]>(
    () =>
      (worldSettingsQuery.data ?? []).map((worldSetting: WorldSettingView) => ({
        id: worldSetting.id,
        name: worldSetting.title,
        subtitle: worldSetting.category,
      })),
    [worldSettingsQuery.data],
  );

  const characterNameMap = useMemo(
    () => new Map((charactersQuery.data ?? []).map((item) => [item.id, item.name])),
    [charactersQuery.data],
  );
  const factionNameMap = useMemo(
    () => new Map((factionsQuery.data ?? []).map((item) => [item.id, item.name])),
    [factionsQuery.data],
  );
  const itemNameMap = useMemo(() => new Map((itemsQuery.data ?? []).map((item) => [item.id, item.name])), [itemsQuery.data]);
  const hookNameMap = useMemo(() => new Map((hooksQuery.data ?? []).map((item) => [item.id, item.title])), [hooksQuery.data]);
  const worldSettingNameMap = useMemo(
    () => new Map((worldSettingsQuery.data ?? []).map((item) => [item.id, item.title])),
    [worldSettingsQuery.data],
  );

  const relationOptions = useMemo<ResourceOption[]>(
    () =>
      (relationsQuery.data ?? []).map((relation: RelationView) => ({
        id: relation.id,
        name: `${relation.sourceType}:${relation.sourceId} → ${relation.targetType}:${relation.targetId}`,
        subtitle: `${getRelationEntityLabel(relation.sourceType, relation.sourceId, {
          characterNameMap,
          factionNameMap,
          itemNameMap,
          hookNameMap,
          worldSettingNameMap,
        })} → ${getRelationEntityLabel(relation.targetType, relation.targetId, {
          characterNameMap,
          factionNameMap,
          itemNameMap,
          hookNameMap,
          worldSettingNameMap,
        })}`,
      })),
    [relationsQuery.data, characterNameMap, factionNameMap, itemNameMap, hookNameMap, worldSettingNameMap],
  );

  const pickerSources: PickerSources = useMemo(
    () => ({
      characters: charactersQuery.data ?? [],
      factions: factionsQuery.data ?? [],
      items: itemsQuery.data ?? [],
      hooks: hooksQuery.data ?? [],
      worldSettings: worldSettingsQuery.data ?? [],
    }),
    [charactersQuery.data, factionsQuery.data, itemsQuery.data, hooksQuery.data, worldSettingsQuery.data],
  );

  const editableResourceMap = useMemo(() => ({
    characters: new Map((charactersQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
    factions: new Map((factionsQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
    items: new Map((itemsQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
    hooks: new Map((hooksQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
    relations: new Map((relationsQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
    worldSettings: new Map((worldSettingsQuery.data ?? []).map((item) => [item.id, item as EditableResourceRecord])),
  }), [charactersQuery.data, factionsQuery.data, itemsQuery.data, hooksQuery.data, relationsQuery.data, worldSettingsQuery.data]);

  // ── Hydrate manualEntityRefs from chapter data ─────────────────────
  useEffect(() => {
    if (!chapterData) {
      return;
    }

    const hydrateKey = `${bookId}:${chapterNo}`;
    if (hydratedManualEntityRefsKeyRef.current === hydrateKey) {
      return;
    }

    hydratedManualEntityRefsKeyRef.current = hydrateKey;
    setManualEntityRefs({
      characterIds: parseIdList(chapterData.actualCharacterIds ?? null),
      factionIds: parseIdList(chapterData.actualFactionIds ?? null),
      itemIds: parseIdList(chapterData.actualItemIds ?? null),
      hookIds: parseIdList(chapterData.actualHookIds ?? null),
      relationIds: [],
      worldSettingIds: parseIdList(chapterData.actualWorldSettingIds ?? null),
    });
  }, [bookId, chapterNo, chapterData]);

  // ── Refresh resource queries ───────────────────────────────────────
  const refreshResourceQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "characters") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "factions") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "items") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "hooks") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "relations") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "worldSettings") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "characters", { mode: "picker" }) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "factions", { mode: "picker" }) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "items", { mode: "picker" }) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "hooks", { mode: "picker" }) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resourceList(safeBookId, "worldSettings", { mode: "picker" }) }),
    ]);
  }, [queryClient, safeBookId]);

  // ── Save resource mutation ─────────────────────────────────────────
  const saveResourceMutation = useMutation({
    mutationFn: async () => {
      if (!resourceEditor) {
        throw new Error("当前没有可编辑的资源。");
      }

      const validationMessage = getResourceFormValidationMessage(resourceEditor.resourceType, resourceEditorForm);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const payload = buildResourceSavePayload(resourceEditor.resourceType, resourceEditorForm);
      return saveResourceRecord(safeBookId, resourceEditor.resourceType, payload, resourceEditor.resourceId);
    },
    onSuccess: async () => {
      await refreshResourceQueries();
      setResourceEditor(null);
    },
  });

  return {
    manualEntityRefs,
    setManualEntityRefs,
    resourceEditor,
    setResourceEditor,
    resourceEditorForm,
    setResourceEditorForm,
    characterOptions,
    factionOptions,
    itemOptions,
    hookOptions,
    worldSettingOptions,
    relationOptions,
    characterNameMap,
    factionNameMap,
    itemNameMap,
    hookNameMap,
    worldSettingNameMap,
    pickerSources,
    editableResourceMap,
    chapterList,
    refreshResourceQueries,
    saveResourceMutation,
  };
}
