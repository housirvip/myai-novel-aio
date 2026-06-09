import type { Dispatch, SetStateAction } from "react";

import { ResourceEditorForm } from "@/components/resources/ResourceEditorForm";
import {
  getResourceFormValidationMessage,
  getResourcePrimaryFieldValue,
  type EditableResourceKey,
  type PickerSources,
  type ResourceEditorFormState,
} from "@/components/resources/resource-editor-shared";
import { formatApiErrorMessage } from "@/lib/api";

export function InlineResourceEditor(props: {
  resourceType: EditableResourceKey;
  resourceId: number;
  form: ResourceEditorFormState;
  setForm: Dispatch<SetStateAction<ResourceEditorFormState>>;
  pickerSources: PickerSources;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  saveError: Error | null;
}) {
  const validationMessage = getResourceFormValidationMessage(props.resourceType, props.form);
  const primaryFieldValue = getResourcePrimaryFieldValue(props.resourceType, props.form);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm px-4 py-16 sm:pt-20" onClick={props.onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="resource-editor-dialog-title" className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="resource-editor-dialog-title" className="text-lg font-semibold text-foreground">修改实体</h3>
            <p className="mt-1 text-sm text-muted-foreground">保存后会刷新当前选择器列表与已选摘要。</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
          >
            关闭
          </button>
        </div>

        <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-lg bg-muted p-4">
          <ResourceEditorForm
            resourceType={props.resourceType}
            form={props.form}
            setForm={props.setForm}
            pickerSources={props.pickerSources}
          />
        </div>

        <div className="mt-4 rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground">
          {props.saveError
            ? formatApiErrorMessage(props.saveError, "资源保存失败")
            : validationMessage ?? "可以直接在这里快捷修改当前实体，无需离开章节工作台。"}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.isSaving}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.isSaving || !primaryFieldValue.trim() || validationMessage !== null}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {props.isSaving ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
