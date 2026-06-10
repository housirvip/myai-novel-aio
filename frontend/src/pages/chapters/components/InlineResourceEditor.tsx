import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    <Dialog open onOpenChange={(open) => { if (!open) props.onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>修改实体</DialogTitle>
              <DialogDescription className="mt-1">保存后会刷新当前选择器列表与已选摘要。</DialogDescription>
            </div>
            <Button type="button" variant="secondary" onClick={props.onClose}>
              关闭
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto rounded-lg bg-muted p-4">
          <ResourceEditorForm
            resourceType={props.resourceType}
            form={props.form}
            setForm={props.setForm}
            pickerSources={props.pickerSources}
          />
        </div>

        <div className="rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground">
          {props.saveError
            ? formatApiErrorMessage(props.saveError, "资源保存失败")
            : validationMessage ?? "可以直接在这里快捷修改当前实体，无需离开章节工作台。"}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={props.onClose} disabled={props.isSaving}>
            取消
          </Button>
          <Button
            type="button"
            onClick={props.onSave}
            disabled={props.isSaving || !primaryFieldValue.trim() || validationMessage !== null}
          >
            {props.isSaving ? "保存中..." : "保存修改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
