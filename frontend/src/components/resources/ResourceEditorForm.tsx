import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CharacterView, FactionView } from "@/lib/types";

import {
  characterStatusOptions,
  factionCategoryOptions,
  factionStatusOptions,
  getEntityOptionsByType,
  hookStatusOptions,
  hookTypeOptions,
  itemCategoryOptions,
  itemOwnerTypes,
  itemRarityOptions,
  itemStatusOptions,
  relationEntityTypes,
  relationStatusOptions,
  relationTypes,
  worldSettingCategoryOptions,
  worldSettingStatusOptions,
  type EditableResourceKey,
  type PickerSources,
  type ResourceEditorFormState,
} from "./resource-editor-shared";

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-muted-foreground">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}

export function ResourceEditorForm(props: {
  resourceType: EditableResourceKey;
  form: ResourceEditorFormState;
  setForm: Dispatch<SetStateAction<ResourceEditorFormState>>;
  pickerSources: PickerSources;
}) {
  const leaderOptions = props.pickerSources.characters.map((item: CharacterView) => ({ value: String(item.id), label: item.name }));
  const relationSourceOptions = getEntityOptionsByType(props.form.sourceType ?? "character", props.pickerSources);
  const relationTargetOptions = getEntityOptionsByType(props.form.targetType ?? "faction", props.pickerSources);
  const itemOwnerOptions = props.form.ownerType === "character"
    ? props.pickerSources.characters.map((item: CharacterView) => ({ value: String(item.id), label: item.name }))
    : props.form.ownerType === "faction"
      ? props.pickerSources.factions.map((item: FactionView) => ({ value: String(item.id), label: item.name }))
      : [];

  if (props.resourceType === "worldSettings") {
    return (
      <div className="space-y-3">
        <Field label="标题"><Input value={props.form.title} onChange={(event) => props.setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="分类">
            <Select value={props.form.category} onChange={(event) => props.setForm((current) => ({ ...current, category: event.target.value }))}>
              {worldSettingCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="状态">
            <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
              {worldSettingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="设定正文"><Textarea className="min-h-40" value={props.form.content} onChange={(event) => props.setForm((current) => ({ ...current, content: event.target.value }))} /></Field>
        <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
        <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
      </div>
    );
  }

  if (props.resourceType === "characters") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="姓名"><Input value={props.form.name} onChange={(event) => props.setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="别名"><Input value={props.form.alias} onChange={(event) => props.setForm((current) => ({ ...current, alias: event.target.value }))} /></Field>
          <Field label="性别"><Input value={props.form.gender} onChange={(event) => props.setForm((current) => ({ ...current, gender: event.target.value }))} /></Field>
          <Field label="年龄"><Input value={props.form.age} onChange={(event) => props.setForm((current) => ({ ...current, age: event.target.value }))} inputMode="numeric" /></Field>
          <Field label="状态">
            <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
              {characterStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="当前位置"><Input value={props.form.currentLocation} onChange={(event) => props.setForm((current) => ({ ...current, currentLocation: event.target.value }))} /></Field>
        </div>
        <Field label="性格"><Textarea className="min-h-24" value={props.form.personality} onChange={(event) => props.setForm((current) => ({ ...current, personality: event.target.value }))} /></Field>
        <Field label="背景"><Textarea className="min-h-32" value={props.form.background} onChange={(event) => props.setForm((current) => ({ ...current, background: event.target.value }))} /></Field>
        <Field label="职业"><Input value={props.form.professions} onChange={(event) => props.setForm((current) => ({ ...current, professions: event.target.value }))} /></Field>
        <Field label="等级/境界"><Input value={props.form.levels} onChange={(event) => props.setForm((current) => ({ ...current, levels: event.target.value }))} /></Field>
        <Field label="货币/资源"><Input value={props.form.currencies} onChange={(event) => props.setForm((current) => ({ ...current, currencies: event.target.value }))} /></Field>
        <Field label="能力"><Textarea className="min-h-24" value={props.form.abilities} onChange={(event) => props.setForm((current) => ({ ...current, abilities: event.target.value }))} /></Field>
        <Field label="目标"><Textarea className="min-h-24" value={props.form.goal} onChange={(event) => props.setForm((current) => ({ ...current, goal: event.target.value }))} /></Field>
        <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
        <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
      </div>
    );
  }

  if (props.resourceType === "factions") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="势力名称"><Input value={props.form.name} onChange={(event) => props.setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="分类">
            <Select value={props.form.category} onChange={(event) => props.setForm((current) => ({ ...current, category: event.target.value }))}>
              {factionCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="状态">
            <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
              {factionStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="总部"><Input value={props.form.headquarter} onChange={(event) => props.setForm((current) => ({ ...current, headquarter: event.target.value }))} /></Field>
        </div>
        <Field label="领袖角色">
          <Select value={props.form.leaderCharacterId} onChange={(event) => props.setForm((current) => ({ ...current, leaderCharacterId: event.target.value }))}>
            <option value="">未设置</option>
            {leaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="核心目标"><Textarea className="min-h-24" value={props.form.coreGoal} onChange={(event) => props.setForm((current) => ({ ...current, coreGoal: event.target.value }))} /></Field>
        <Field label="描述"><Textarea className="min-h-32" value={props.form.description} onChange={(event) => props.setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
        <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
      </div>
    );
  }

  if (props.resourceType === "relations") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="起点类型">
            <Select value={props.form.sourceType} onChange={(event) => props.setForm((current) => ({ ...current, sourceType: event.target.value, sourceId: "" }))}>
              {relationEntityTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="终点类型">
            <Select value={props.form.targetType} onChange={(event) => props.setForm((current) => ({ ...current, targetType: event.target.value, targetId: "" }))}>
              {relationEntityTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="起点实体">
            <Select value={props.form.sourceId} onChange={(event) => props.setForm((current) => ({ ...current, sourceId: event.target.value }))}>
              <option value="">请选择</option>
              {relationSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="终点实体">
            <Select value={props.form.targetId} onChange={(event) => props.setForm((current) => ({ ...current, targetId: event.target.value }))}>
              <option value="">请选择</option>
              {relationTargetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="关系类型">
            <Select value={props.form.relationType} onChange={(event) => props.setForm((current) => ({ ...current, relationType: event.target.value }))}>
              {relationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="强度"><Input value={props.form.intensity} onChange={(event) => props.setForm((current) => ({ ...current, intensity: event.target.value }))} inputMode="numeric" /></Field>
        </div>
        <Field label="状态">
          <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
            {relationStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="描述"><Textarea className="min-h-28" value={props.form.description} onChange={(event) => props.setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
        <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
      </div>
    );
  }

  if (props.resourceType === "items") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="物品名称"><Input value={props.form.name} onChange={(event) => props.setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="分类">
            <Select value={props.form.category} onChange={(event) => props.setForm((current) => ({ ...current, category: event.target.value }))}>
              {itemCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="稀有度">
            <Select value={props.form.rarity} onChange={(event) => props.setForm((current) => ({ ...current, rarity: event.target.value }))}>
              <option value="">未设置</option>
              {itemRarityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="状态">
            <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
              {itemStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="归属类型">
            <Select value={props.form.ownerType} onChange={(event) => props.setForm((current) => ({ ...current, ownerType: event.target.value, ownerId: "" }))}>
              {itemOwnerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="归属实体">
            <Select value={props.form.ownerId} onChange={(event) => props.setForm((current) => ({ ...current, ownerId: event.target.value }))} disabled={props.form.ownerType === "none"}>
              <option value="">未设置</option>
              {itemOwnerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="描述"><Textarea className="min-h-32" value={props.form.description} onChange={(event) => props.setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
        <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="标题"><Input value={props.form.title} onChange={(event) => props.setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="钩子类型">
          <Select value={props.form.hookType} onChange={(event) => props.setForm((current) => ({ ...current, hookType: event.target.value }))}>
            <option value="">未设置</option>
            {hookTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="状态">
          <Select value={props.form.status} onChange={(event) => props.setForm((current) => ({ ...current, status: event.target.value }))}>
            {hookStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="来源章节"><Input value={props.form.sourceChapterNo} onChange={(event) => props.setForm((current) => ({ ...current, sourceChapterNo: event.target.value }))} inputMode="numeric" /></Field>
        <Field label="目标章节"><Input value={props.form.targetChapterNo} onChange={(event) => props.setForm((current) => ({ ...current, targetChapterNo: event.target.value }))} inputMode="numeric" /></Field>
        <Field label="重要性"><Input value={props.form.importance} onChange={(event) => props.setForm((current) => ({ ...current, importance: event.target.value }))} /></Field>
      </div>
      <Field label="描述"><Textarea className="min-h-32" value={props.form.description} onChange={(event) => props.setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
      <Field label="附加备注"><Textarea className="min-h-24" value={props.form.appendNotes} onChange={(event) => props.setForm((current) => ({ ...current, appendNotes: event.target.value }))} /></Field>
      <Field label="关键词"><Input value={props.form.keywords} onChange={(event) => props.setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="逗号分隔" /></Field>
    </div>
  );
}
