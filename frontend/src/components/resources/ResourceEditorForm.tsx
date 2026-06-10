import type { Dispatch, SetStateAction } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Option = { value: string; label: string };

const EMPTY_SELECT_VALUE = "__empty__";

function OptionSelect(props: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<Option>;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={props.label}>
      <Select value={props.value || EMPTY_SELECT_VALUE} onValueChange={(value) => props.onValueChange(value === EMPTY_SELECT_VALUE ? "" : value)} disabled={props.disabled}>
        <SelectTrigger aria-label={props.label}>
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value || EMPTY_SELECT_VALUE} value={option.value || EMPTY_SELECT_VALUE}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function textInput(
  label: string,
  value: string,
  onChange: (value: string) => void,
  props: { placeholder?: string; inputMode?: "numeric" } = {},
) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={props.placeholder} inputMode={props.inputMode} />
    </Field>
  );
}

function textArea(label: string, value: string, onChange: (value: string) => void, minHeight = "min-h-28") {
  return (
    <Field label={label}>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className={minHeight} />
    </Field>
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

  const setField = (patch: Partial<ResourceEditorFormState>) => props.setForm((current) => ({ ...current, ...patch } as ResourceEditorFormState));

  if (props.resourceType === "worldSettings") {
    return (
      <div className="space-y-3">
        {textInput("标题", props.form.title, (title) => setField({ title }))}
        <div className="grid gap-3 md:grid-cols-2">
          <OptionSelect label="分类" value={props.form.category} onValueChange={(category) => setField({ category })} options={worldSettingCategoryOptions} />
          <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={worldSettingStatusOptions} />
        </div>
        {textArea("设定正文", props.form.content, (content) => setField({ content }), "min-h-40")}
        {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
        {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
      </div>
    );
  }

  if (props.resourceType === "characters") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {textInput("姓名", props.form.name, (name) => setField({ name }))}
          {textInput("别名", props.form.alias, (alias) => setField({ alias }))}
          {textInput("性别", props.form.gender, (gender) => setField({ gender }))}
          {textInput("年龄", props.form.age, (age) => setField({ age }), { inputMode: "numeric" })}
          <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={characterStatusOptions} />
          {textInput("当前位置", props.form.currentLocation, (currentLocation) => setField({ currentLocation }))}
        </div>
        {textArea("性格", props.form.personality, (personality) => setField({ personality }), "min-h-24")}
        {textArea("背景", props.form.background, (background) => setField({ background }), "min-h-32")}
        {textInput("职业", props.form.professions, (professions) => setField({ professions }))}
        {textInput("等级/境界", props.form.levels, (levels) => setField({ levels }))}
        {textInput("货币/资源", props.form.currencies, (currencies) => setField({ currencies }))}
        {textArea("能力", props.form.abilities, (abilities) => setField({ abilities }), "min-h-24")}
        {textArea("目标", props.form.goal, (goal) => setField({ goal }), "min-h-24")}
        {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
        {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
      </div>
    );
  }

  if (props.resourceType === "factions") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {textInput("势力名称", props.form.name, (name) => setField({ name }))}
          <OptionSelect label="分类" value={props.form.category} onValueChange={(category) => setField({ category })} options={factionCategoryOptions} />
          <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={factionStatusOptions} />
          {textInput("总部", props.form.headquarter, (headquarter) => setField({ headquarter }))}
        </div>
        <OptionSelect label="领袖角色" value={props.form.leaderCharacterId} onValueChange={(leaderCharacterId) => setField({ leaderCharacterId })} options={[{ value: "", label: "未设置" }, ...leaderOptions]} placeholder="未设置" />
        {textArea("核心目标", props.form.coreGoal, (coreGoal) => setField({ coreGoal }), "min-h-24")}
        {textArea("描述", props.form.description, (description) => setField({ description }), "min-h-32")}
        {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
        {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
      </div>
    );
  }

  if (props.resourceType === "relations") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <OptionSelect label="起点类型" value={props.form.sourceType} onValueChange={(sourceType) => setField({ sourceType, sourceId: "" })} options={relationEntityTypes} />
          <OptionSelect label="终点类型" value={props.form.targetType} onValueChange={(targetType) => setField({ targetType, targetId: "" })} options={relationEntityTypes} />
          <OptionSelect label="起点实体" value={props.form.sourceId} onValueChange={(sourceId) => setField({ sourceId })} options={[{ value: "", label: "请选择" }, ...relationSourceOptions]} placeholder="请选择" />
          <OptionSelect label="终点实体" value={props.form.targetId} onValueChange={(targetId) => setField({ targetId })} options={[{ value: "", label: "请选择" }, ...relationTargetOptions]} placeholder="请选择" />
          <OptionSelect label="关系类型" value={props.form.relationType} onValueChange={(relationType) => setField({ relationType })} options={relationTypes} />
          {textInput("强度", props.form.intensity, (intensity) => setField({ intensity }), { inputMode: "numeric" })}
        </div>
        <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={relationStatusOptions} />
        {textArea("描述", props.form.description, (description) => setField({ description }), "min-h-28")}
        {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
        {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
      </div>
    );
  }

  if (props.resourceType === "items") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {textInput("物品名称", props.form.name, (name) => setField({ name }))}
          <OptionSelect label="分类" value={props.form.category} onValueChange={(category) => setField({ category })} options={itemCategoryOptions} />
          <OptionSelect label="稀有度" value={props.form.rarity} onValueChange={(rarity) => setField({ rarity })} options={[{ value: "", label: "未设置" }, ...itemRarityOptions]} placeholder="未设置" />
          <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={itemStatusOptions} />
          <OptionSelect label="归属类型" value={props.form.ownerType} onValueChange={(ownerType) => setField({ ownerType, ownerId: "" })} options={itemOwnerTypes.map((type) => ({ value: type, label: type }))} />
          <OptionSelect label="归属实体" value={props.form.ownerId} onValueChange={(ownerId) => setField({ ownerId })} options={[{ value: "", label: "未设置" }, ...itemOwnerOptions]} placeholder="未设置" disabled={props.form.ownerType === "none"} />
        </div>
        {textArea("描述", props.form.description, (description) => setField({ description }), "min-h-32")}
        {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
        {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {textInput("标题", props.form.title, (title) => setField({ title }))}
      <div className="grid gap-3 md:grid-cols-2">
        <OptionSelect label="钩子类型" value={props.form.hookType} onValueChange={(hookType) => setField({ hookType })} options={[{ value: "", label: "未设置" }, ...hookTypeOptions]} placeholder="未设置" />
        <OptionSelect label="状态" value={props.form.status} onValueChange={(status) => setField({ status })} options={hookStatusOptions} />
        {textInput("来源章节", props.form.sourceChapterNo, (sourceChapterNo) => setField({ sourceChapterNo }), { inputMode: "numeric" })}
        {textInput("目标章节", props.form.targetChapterNo, (targetChapterNo) => setField({ targetChapterNo }), { inputMode: "numeric" })}
        {textInput("重要性", props.form.importance, (importance) => setField({ importance }))}
      </div>
      {textArea("描述", props.form.description, (description) => setField({ description }), "min-h-32")}
      {textArea("附加备注", props.form.appendNotes, (appendNotes) => setField({ appendNotes }), "min-h-24")}
      {textInput("关键词", props.form.keywords, (keywords) => setField({ keywords }), { placeholder: "逗号分隔" })}
    </div>
  );
}
