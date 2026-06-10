import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatApiErrorMessage } from "@/lib/api";
import { clearUserRuntimeSettings, getUserRuntimeSettings, updateUserRuntimeSettings } from "@/lib/user-settings-api";
import { queryKeys } from "@/lib/query/query-keys";
import type { UserRuntimeSettingsUpdateInput } from "@/lib/types";

type UserSettingsFormState = {
  llmProvider: "mock" | "openai" | "anthropic" | "custom";
  llmModel: string;
  llmLowModel: string;
  llmMidModel: string;
  llmHighModel: string;
  llmDefaultMaxTokens: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  customLlmApiKey: string;
  customLlmBaseUrl: string;
};

function normalizeStringInput(value: string): string | null | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatSecretSummary(hasValue: boolean, maskedValue: string | null) {
  if (!hasValue) {
    return "未配置";
  }
  return maskedValue ?? "已配置";
}

function formatOverridePlaceholder(overrideValue: string | number | undefined, serverDefaultValue: string | number | undefined) {
  if (overrideValue !== undefined) {
    return "已配置个人覆盖";
  }

  if (serverDefaultValue !== undefined && String(serverDefaultValue).trim().length > 0) {
    return `Server Default: ${serverDefaultValue}`;
  }

  return "未配置";
}

export function UserSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: queryKeys.userRuntimeSettings(),
    queryFn: () => getUserRuntimeSettings(),
  });

  const [form, setForm] = useState<UserSettingsFormState>({
    llmProvider: "mock",
    llmModel: "",
    llmLowModel: "",
    llmMidModel: "",
    llmHighModel: "",
    llmDefaultMaxTokens: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    anthropicApiKey: "",
    anthropicBaseUrl: "",
    customLlmApiKey: "",
    customLlmBaseUrl: "",
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setForm({
      llmProvider: settingsQuery.data.overrides.provider ?? settingsQuery.data.serverDefaults.provider ?? "mock",
      llmModel: settingsQuery.data.overrides.model ?? "",
      llmLowModel: settingsQuery.data.overrides.lowModel ?? "",
      llmMidModel: settingsQuery.data.overrides.midModel ?? "",
      llmHighModel: settingsQuery.data.overrides.highModel ?? "",
      llmDefaultMaxTokens:
        typeof settingsQuery.data.overrides.defaultMaxTokens === "number"
          ? String(settingsQuery.data.overrides.defaultMaxTokens)
          : "",
      openaiApiKey: "",
      openaiBaseUrl: settingsQuery.data.overrides.openaiBaseUrl ?? "",
      anthropicApiKey: "",
      anthropicBaseUrl: settingsQuery.data.overrides.anthropicBaseUrl ?? "",
      customLlmApiKey: "",
      customLlmBaseUrl: settingsQuery.data.overrides.customLlmBaseUrl ?? "",
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (input: UserRuntimeSettingsUpdateInput) => updateUserRuntimeSettings(input),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.userRuntimeSettings(), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userRuntimeSettings() });
      setForm((current) => ({
        ...current,
        openaiApiKey: "",
        anthropicApiKey: "",
        customLlmApiKey: "",
      }));
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearUserRuntimeSettings(),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.userRuntimeSettings(), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userRuntimeSettings() });
    },
  });

  const handleSave = () => {
    const payload: UserRuntimeSettingsUpdateInput = {
      llmProvider: form.llmProvider,
      llmModel: normalizeStringInput(form.llmModel),
      llmLowModel: normalizeStringInput(form.llmLowModel),
      llmMidModel: normalizeStringInput(form.llmMidModel),
      llmHighModel: normalizeStringInput(form.llmHighModel),
      llmDefaultMaxTokens: form.llmDefaultMaxTokens.trim() ? Number(form.llmDefaultMaxTokens) : null,
      openaiApiKey: form.openaiApiKey.trim() ? form.openaiApiKey : undefined,
      openaiBaseUrl: normalizeStringInput(form.openaiBaseUrl),
      anthropicApiKey: form.anthropicApiKey.trim() ? form.anthropicApiKey : undefined,
      anthropicBaseUrl: normalizeStringInput(form.anthropicBaseUrl),
      customLlmApiKey: form.customLlmApiKey.trim() ? form.customLlmApiKey : undefined,
      customLlmBaseUrl: normalizeStringInput(form.customLlmBaseUrl),
    };

    saveMutation.mutate(payload);
  };

  const effective = settingsQuery.data?.effective;
  const serverDefaults = settingsQuery.data?.serverDefaults;
  const capabilities = settingsQuery.data?.capabilities;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">个人运行配置</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          这里保存的是当前用户的默认运行参数。未填写个人覆盖时，会显示并回退到 Server Default；Chapter Workbench 中手工填写的 provider/model 只覆盖当前一次 workflow 请求。
        </p>
      </div>

      {(settingsQuery.isError || saveMutation.isError || clearMutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {formatApiErrorMessage(
              settingsQuery.error ?? saveMutation.error ?? clearMutation.error,
              "加载或保存个人配置失败",
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground">默认参数</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">默认 Provider</div>
              <Select
                value={form.llmProvider}
                onChange={(event) => setForm((current) => ({ ...current, llmProvider: event.target.value as UserSettingsFormState["llmProvider"] }))}
              >
                <option value="mock">mock</option>
                <option value="openai">openai</option>
                <option value="anthropic">anthropic</option>
                <option value="custom">custom</option>
              </Select>
            </label>
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">通用模型</div>
              <Input value={form.llmModel} onChange={(event) => setForm((current) => ({ ...current, llmModel: event.target.value }))} placeholder={formatOverridePlaceholder(settingsQuery.data?.overrides.model, serverDefaults?.model)} />
            </label>
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">Low 模型</div>
              <Input value={form.llmLowModel} onChange={(event) => setForm((current) => ({ ...current, llmLowModel: event.target.value }))} placeholder={formatOverridePlaceholder(settingsQuery.data?.overrides.lowModel, serverDefaults?.lowModel)} />
            </label>
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">Mid 模型</div>
              <Input value={form.llmMidModel} onChange={(event) => setForm((current) => ({ ...current, llmMidModel: event.target.value }))} placeholder={formatOverridePlaceholder(settingsQuery.data?.overrides.midModel, serverDefaults?.midModel)} />
            </label>
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">High 模型</div>
              <Input value={form.llmHighModel} onChange={(event) => setForm((current) => ({ ...current, llmHighModel: event.target.value }))} placeholder={formatOverridePlaceholder(settingsQuery.data?.overrides.highModel, serverDefaults?.highModel)} />
            </label>
            <label className="text-sm text-muted-foreground">
              <div className="mb-2 text-xs text-muted-foreground">默认 Max Tokens</div>
              <Input value={form.llmDefaultMaxTokens} onChange={(event) => setForm((current) => ({ ...current, llmDefaultMaxTokens: event.target.value }))} placeholder={formatOverridePlaceholder(settingsQuery.data?.overrides.defaultMaxTokens, serverDefaults?.defaultMaxTokens)} />
            </label>
          </div>

          <h3 className="mt-8 text-lg font-semibold text-foreground">Provider 连接配置</h3>
          <div className="mt-4 space-y-5">
            <Card className="bg-muted p-4">
              <div className="font-medium text-foreground">OpenAI</div>
              <div className="mt-1 text-xs text-muted-foreground">API Key 保存后仅显示掩码，不会明文回显。</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input value={form.openaiApiKey} onChange={(event) => setForm((current) => ({ ...current, openaiApiKey: event.target.value }))} placeholder="输入新 API Key 留空则保持原值" />
                <Input value={form.openaiBaseUrl} onChange={(event) => setForm((current) => ({ ...current, openaiBaseUrl: event.target.value }))} placeholder="Base URL" />
              </div>
            </Card>

            <Card className="bg-muted p-4">
              <div className="font-medium text-foreground">Anthropic</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input value={form.anthropicApiKey} onChange={(event) => setForm((current) => ({ ...current, anthropicApiKey: event.target.value }))} placeholder="输入新 API Key 留空则保持原值" />
                <Input value={form.anthropicBaseUrl} onChange={(event) => setForm((current) => ({ ...current, anthropicBaseUrl: event.target.value }))} placeholder="Base URL" />
              </div>
            </Card>

            <Card className="bg-muted p-4">
              <div className="font-medium text-foreground">Custom</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input value={form.customLlmApiKey} onChange={(event) => setForm((current) => ({ ...current, customLlmApiKey: event.target.value }))} placeholder="可选 API Key" />
                <Input value={form.customLlmBaseUrl} onChange={(event) => setForm((current) => ({ ...current, customLlmBaseUrl: event.target.value }))} placeholder="Base URL" />
              </div>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending || saveMutation.isPending}>
              清空个人覆盖
            </Button>
            <Button type="button" onClick={handleSave} disabled={saveMutation.isPending || clearMutation.isPending || settingsQuery.isLoading}>
              {saveMutation.isPending ? "保存中..." : "保存个人配置"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">Server Default</h3>
            {settingsQuery.isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : serverDefaults ? (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  { label: "Provider", value: serverDefaults.provider ?? "—" },
                  { label: "通用模型", value: serverDefaults.model ?? "—" },
                  { label: "Low / Mid / High", value: `${serverDefaults.lowModel || "—"} / ${serverDefaults.midModel || "—"} / ${serverDefaults.highModel || "—"}` },
                  { label: "Max Tokens", value: String(serverDefaults.defaultMaxTokens ?? "—") },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted p-4">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="mt-1 font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-warning">当前后端还没有返回 Server Default，请重启后端服务后刷新页面。</div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">当前生效值</h3>
            {effective ? (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Provider</div>
                  <div className="mt-1 font-medium text-foreground">{effective.provider ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Low / Mid / High</div>
                  <div className="mt-1 text-foreground">{effective.lowModel || "—"} / {effective.midModel || "—"} / {effective.highModel || "—"}</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Max Tokens</div>
                  <div className="mt-1 font-medium text-foreground">{effective.defaultMaxTokens ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                  <div>OpenAI Key：{formatSecretSummary(effective.openaiApiKey.hasValue, effective.openaiApiKey.maskedValue)}</div>
                  <div className="mt-1">Anthropic Key：{formatSecretSummary(effective.anthropicApiKey.hasValue, effective.anthropicApiKey.maskedValue)}</div>
                  <div className="mt-1">Custom Key：{formatSecretSummary(effective.customLlmApiKey.hasValue, effective.customLlmApiKey.maskedValue)}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">Provider 可用性</h3>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {capabilities ? capabilities.allowedProviders.map((provider) => (
                <div key={provider} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                  <span>{provider}</span>
                  <span className={capabilities.providerAvailability[provider] ? "text-success" : "text-warning"}>
                    {capabilities.providerAvailability[provider] ? "可用" : "缺少配置"}
                  </span>
                </div>
              )) : (
                <div className="space-y-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
