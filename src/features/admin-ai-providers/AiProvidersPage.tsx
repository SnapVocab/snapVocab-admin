import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmModal,
  Drawer,
  Field,
  fieldControl,
  PageHeader,
  PanelSkeleton,
  SectionLabel,
  SourceError,
  StripCell,
  StripNote,
  SummaryStrip,
  toolbarControl,
  useToast,
} from '../../components/ui';
import {
  createAiProvider,
  deleteAiProvider,
  fetchProviderModels,
  listAiProviders,
  testAiProvider,
  updateAiProvider,
} from '../../domains/admin-ai-providers/api';
import type {
  AiModelOptionDTO,
  AiProviderDTO,
  AiProviderType,
  TestAiProviderResponse,
  UpsertAiProviderRequest,
} from '../../domains/admin-ai-providers/types';
import { cn } from '../../lib/utils';

interface ProviderPreset {
  label: string;
  name: string;
  providerType: AiProviderType;
  baseUrl: string;
  defaultModel: string;
}

const PRESETS: ProviderPreset[] = [
  {
    label: 'Groq Cloud',
    name: 'Groq Cloud',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    label: 'DeepSeek',
    name: 'DeepSeek',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  {
    label: 'Google Gemini',
    name: 'Google Gemini',
    providerType: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
  },
  {
    label: 'OpenAI',
    name: 'OpenAI',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  {
    label: 'OpenRouter',
    name: 'OpenRouter',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash',
  },
  {
    label: 'Ollama Local',
    name: 'Ollama Local',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
  },
];

const EMPTY_FORM: UpsertAiProviderRequest = {
  name: 'Groq Cloud',
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: '',
  modelName: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 2048,
  timeoutMs: 20000,
  enabled: true,
  priority: 1,
};

type StatusFilter = 'all' | 'enabled' | 'disabled';

function formatUpdatedTime(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProviderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const { show: showToast, node: toastNode } = useToast();

  // Drawer editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AiProviderDTO | null>(null);
  const [form, setForm] = useState<UpsertAiProviderRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic model list fetcher state
  const [models, setModels] = useState<AiModelOptionDTO[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  // Per-row actions
  const [testingId, setTestingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestAiProviderResponse>>({});
  const [deleting, setDeleting] = useState<AiProviderDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await listAiProviders();
      setProviders(data);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError((e as Error).message || 'Không tải được danh sách AI Provider');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const counts = useMemo(() => {
    let enabled = 0;
    let disabled = 0;
    for (const p of providers) {
      if (p.enabled) enabled += 1;
      else disabled += 1;
    }
    return { total: providers.length, enabled, disabled };
  }, [providers]);

  const primaryActive = useMemo(
    () => providers.find((p) => p.enabled) ?? null,
    [providers],
  );

  const visibleProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (statusFilter === 'enabled' && !p.enabled) return false;
      if (statusFilter === 'disabled' && p.enabled) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.modelName.toLowerCase().includes(q) ||
        p.baseUrl.toLowerCase().includes(q) ||
        p.providerType.toLowerCase().includes(q)
      );
    });
  }, [providers, statusFilter, query]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, priority: providers.length + 1 });
    setFormError(null);
    setModels([]);
    setModelsError(null);
    setModelSearch('');
    setEditorOpen(true);
  };

  const openEdit = (p: AiProviderDTO) => {
    setEditing(p);
    setForm({
      name: p.name,
      providerType: p.providerType,
      baseUrl: p.baseUrl,
      apiKey: '',
      modelName: p.modelName,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
      timeoutMs: p.timeoutMs,
      enabled: p.enabled,
      priority: p.priority,
    });
    setFormError(null);
    setModels([]);
    setModelsError(null);
    setModelSearch('');
    setEditorOpen(true);
  };

  const applyPreset = (preset: ProviderPreset) => {
    setForm((prev) => ({
      ...prev,
      name: editing ? prev.name : preset.name,
      providerType: preset.providerType,
      baseUrl: preset.baseUrl,
      modelName: preset.defaultModel,
    }));
    setModels([]);
    setModelsError(null);
  };

  const handleFetchModels = async () => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const fetched = await fetchProviderModels({
        providerId: editing?.id,
        providerType: form.providerType,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey?.trim() || undefined,
      });
      setModels(fetched);
      if (fetched.length === 0) {
        setModelsError('Provider không trả về model nào.');
      } else {
        showToast(`Đã tải ${fetched.length} model từ ${form.name}.`);
      }
    } catch (e) {
      setModelsError((e as Error).message || 'Không tải được danh sách model. Kiểm tra API key và Base URL.');
    } finally {
      setLoadingModels(false);
    }
  };

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q),
    );
  }, [models, modelSearch]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.baseUrl.trim() || !form.modelName.trim()) {
      setFormError('Vui lòng điền đầy đủ Tên hiển thị, Base URL và Model Name.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateAiProvider(editing.id, form);
        showToast(`Đã cập nhật ${form.name}.`);
      } else {
        await createAiProvider(form);
        showToast(`Đã thêm ${form.name}.`);
      }
      setEditorOpen(false);
      await load(true);
    } catch (err) {
      setFormError((err as Error).message || 'Lưu cấu hình thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (p: AiProviderDTO) => {
    setTogglingId(p.id);
    try {
      await updateAiProvider(p.id, {
        name: p.name,
        providerType: p.providerType,
        baseUrl: p.baseUrl,
        modelName: p.modelName,
        temperature: p.temperature,
        maxTokens: p.maxTokens,
        timeoutMs: p.timeoutMs,
        priority: p.priority,
        enabled: !p.enabled,
      });
      showToast(p.enabled ? `Đã tạm tắt ${p.name}.` : `Đã bật ${p.name}.`);
      await load(true);
    } catch (err) {
      showToast((err as Error).message || 'Không đổi được trạng thái.', true);
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteAiProvider(deleting.id);
      showToast(`Đã xóa ${deleting.name}.`);
      setDeleting(null);
      await load(true);
    } catch (err) {
      showToast((err as Error).message || 'Xóa thất bại.', true);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await testAiProvider(id);
      setTestResults((prev) => ({ ...prev, [id]: res }));
      if (res.ok) {
        showToast(`Kết nối thành công (${res.latencyMs}ms).`);
      } else {
        showToast(`Test thất bại: ${res.error || 'Lỗi không xác định'}`, true);
      }
    } catch (err) {
      const message = (err as Error).message || 'Không thể kiểm tra kết nối';
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, error: message },
      }));
      showToast(message, true);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      {toastNode}

      <PageHeader
        title="AI Providers"
        description="Cấu hình chuỗi fallback LLM cho AI Context Story (tối đa 20 từ/truyện). Khi provider ưu tiên #1 lỗi hoặc hết quota, hệ thống tự động chuyển sang #2."
        actions={
          <>
            {updatedAt && (
              <span className="hidden text-xs text-text-muted sm:inline">
                Cập nhật {formatUpdatedTime(updatedAt)}
              </span>
            )}
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw className={refreshing ? 'animate-spin' : undefined} />}
              disabled={loading || refreshing}
              onClick={() => void load(true)}
            >
              Làm mới
            </Button>
            <Button variant="primary" size="md" icon={<Plus />} onClick={openCreate}>
              Thêm provider
            </Button>
          </>
        }
      />

      {/* Hairline summary strip — matches Badges / Missions / Learners */}
      <SummaryStrip label="Tổng quan AI Providers">
        <StripCell
          value={counts.total}
          label="Tổng provider"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StripCell
          value={counts.enabled}
          label="Đang bật"
          dot="bg-primary"
          active={statusFilter === 'enabled'}
          onClick={() => setStatusFilter('enabled')}
        />
        <StripCell
          value={counts.disabled}
          label="Tạm tắt"
          dot="bg-border-strong"
          active={statusFilter === 'disabled'}
          onClick={() => setStatusFilter('disabled')}
        />
        <StripNote push>
          {primaryActive ? (
            <>
              <span className="font-semibold text-text">
                Ưu tiên #1: {primaryActive.name}
              </span>
              <span className="font-mono text-2xs text-text-muted">{primaryActive.modelName}</span>
            </>
          ) : (
            <span className="text-warning-dark">Chưa có provider nào đang bật</span>
          )}
        </StripNote>
      </SummaryStrip>

      {error && (
        <SourceError
          what="danh sách AI Providers"
          stale={providers.length > 0}
          detail={error}
          onRetry={() => void load(providers.length > 0)}
        />
      )}

      {/* Search toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, model, URL…"
            className={cn(toolbarControl, 'w-full pl-8')}
          />
        </div>
        <div className="text-xs text-text-muted tabular-nums">
          Hiển thị {visibleProviders.length} / {providers.length} provider
        </div>
      </div>

      {/* Main table container */}
      {loading ? (
        <PanelSkeleton rows={5} />
      ) : visibleProviders.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-semibold text-text">
            {providers.length === 0 ? 'Chưa có AI Provider nào trong hệ thống' : 'Không tìm thấy provider phù hợp'}
          </p>
          <p className="mt-1 text-body text-text-muted">
            {providers.length === 0
              ? 'Thêm Groq, DeepSeek, Google Gemini hoặc OpenAI-compatible để kích hoạt tính năng AI Context Story.'
              : 'Thử xóa bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
          {providers.length === 0 && (
            <div className="mt-4">
              <Button variant="primary" size="md" icon={<Plus />} onClick={openCreate}>
                Thêm provider đầu tiên
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-subtle text-text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Ưu tiên</th>
                  <th className="px-4 py-2.5 font-semibold">Provider & Model</th>
                  <th className="px-4 py-2.5 font-semibold">Adapter & Base URL</th>
                  <th className="px-4 py-2.5 font-semibold">API Key</th>
                  <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleProviders.map((p) => {
                  const testRes = testResults[p.id];
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'transition-colors hover:bg-surface-subtle/50',
                        !p.enabled && 'opacity-65',
                      )}
                    >
                      <td className="px-4 py-3 font-semibold tabular-nums text-text">
                        #{p.priority}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-body font-semibold text-text">{p.name}</div>
                        <div className="mt-0.5 font-mono text-2xs text-text-muted">{p.modelName}</div>
                        {testRes && (
                          <div
                            className={cn(
                              'mt-1.5 inline-flex items-center gap-1 text-2xs font-medium',
                              testRes.ok ? 'text-primary-dark' : 'text-danger-dark',
                            )}
                          >
                            {testRes.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {testRes.ok
                              ? `OK · ${testRes.latencyMs}ms`
                              : `Lỗi: ${testRes.error || 'Không kết nối được'}`}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={p.providerType === 'GEMINI' ? 'info' : 'neutral'}>
                          {p.providerType}
                        </Badge>
                        <div className="mt-1 max-w-xs truncate font-mono text-2xs text-text-muted">
                          {p.baseUrl}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-2xs text-text-muted">
                        {p.hasApiKey ? p.maskedApiKey : <span className="italic text-text-light">Chưa cấu hình</span>}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={togglingId === p.id}
                          onClick={() => void handleToggleEnabled(p)}
                          title={p.enabled ? 'Nhấn để tạm tắt' : 'Nhấn để bật lại'}
                          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info disabled:opacity-50"
                        >
                          <Badge tone={p.enabled ? 'success' : 'neutral'}>
                            {p.enabled ? 'Đang bật' : 'Tạm tắt'}
                          </Badge>
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Play />}
                            loading={testingId === p.id}
                            loadingText="Đang test…"
                            onClick={() => void handleTest(p.id)}
                          >
                            Test
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit3 />}
                            onClick={() => openEdit(p)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="danger-outline"
                            size="sm"
                            icon={<Trash2 />}
                            label={`Xóa ${p.name}`}
                            onClick={() => setDeleting(p)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Right-hand Drawer Editor — matches design.md §5.5 */}
      {editorOpen && (
        <Drawer
          title={editing ? `Chỉnh sửa ${editing.name}` : 'Thêm AI Provider'}
          subtitle={
            editing
              ? `ID #${editing.id} · ${editing.providerType}`
              : 'Chọn preset nhanh hoặc cấu hình endpoint OpenAI-compatible / Gemini.'
          }
          onClose={() => setEditorOpen(false)}
          busy={saving}
          footer={
            <>
              <Button variant="secondary" size="md" disabled={saving} onClick={() => setEditorOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={saving}
                loadingText="Đang lưu…"
                onClick={() => void handleSave()}
              >
                {editing ? 'Lưu thay đổi' : 'Tạo provider'}
              </Button>
            </>
          }
        >
          <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-light px-3.5 py-2.5 text-xs text-danger-dark"
              >
                {formError}
              </div>
            )}

            {/* Presets */}
            <div className="space-y-2">
              <SectionLabel>Chọn nhanh cấu hình mẫu</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => {
                  const selected =
                    form.baseUrl === preset.baseUrl && form.providerType === preset.providerType;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary-light text-primary-dark'
                          : 'border-border bg-surface text-text hover:bg-surface-subtle',
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connection section */}
            <div className="space-y-3">
              <SectionLabel>Kết nối</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên hiển thị" required>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Groq Primary"
                    className={fieldControl}
                  />
                </Field>

                <Field label="Loại Adapter" required>
                  <select
                    value={form.providerType}
                    onChange={(e) =>
                      setForm({ ...form, providerType: e.target.value as AiProviderType })
                    }
                    className={fieldControl}
                  >
                    <option value="OPENAI_COMPATIBLE">OPENAI_COMPATIBLE</option>
                    <option value="GEMINI">GEMINI (Google AI Studio)</option>
                  </select>
                </Field>
              </div>

              <Field label="Base URL" required>
                <input
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://api.groq.com/openai/v1"
                  className={cn(fieldControl, 'font-mono text-xs')}
                />
              </Field>

              <Field
                label="API Key"
                hint={
                  editing
                    ? 'Để trống nếu muốn giữ nguyên API key đã mã hóa hiện tại.'
                    : 'Key được mã hóa AES-GCM trước khi lưu vào cơ sở dữ liệu.'
                }
              >
                <input
                  type="password"
                  value={form.apiKey ?? ''}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editing?.maskedApiKey || 'Nhập API key…'}
                  className={cn(fieldControl, 'font-mono text-xs')}
                />
              </Field>
            </div>

            {/* Model selection section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SectionLabel>Model</SectionLabel>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw />}
                  loading={loadingModels}
                  loadingText="Đang tải…"
                  onClick={() => void handleFetchModels()}
                >
                  Tải danh sách model
                </Button>
              </div>

              <Field label="Model Name" required error={modelsError ?? undefined}>
                <input
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  placeholder="llama-3.3-70b-versatile"
                  className={cn(fieldControl, 'font-mono text-xs')}
                />
              </Field>

              {models.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border bg-surface-subtle/50 p-3">
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-light"
                    />
                    <input
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder={`Tìm trong ${models.length} model…`}
                      className={cn(fieldControl, 'h-8 py-1 pl-8 text-xs')}
                    />
                  </div>
                  <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-border bg-surface p-1">
                    {filteredModels.map((m) => {
                      const active = form.modelName === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setForm({ ...form, modelName: m.id })}
                          className={cn(
                            'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors',
                            active
                              ? 'bg-primary-light font-semibold text-primary-dark'
                              : 'text-text hover:bg-surface-subtle',
                          )}
                        >
                          <span className="truncate font-mono">{m.id}</span>
                          {m.displayName !== m.id && (
                            <span className="ml-2 truncate text-2xs text-text-muted">
                              {m.displayName}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {filteredModels.length === 0 && (
                      <div className="px-2.5 py-4 text-center text-xs text-text-muted">
                        Không có model nào khớp "{modelSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Runtime parameters */}
            <div className="space-y-3">
              <SectionLabel>Tham số vận hành</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ưu tiên" hint="1 = chạy trước">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={form.priority ?? 1}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className={cn(fieldControl, 'tabular-nums')}
                  />
                </Field>
                <Field label="Temperature" hint="0.0 – 2.0">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={form.temperature ?? 0.7}
                    onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                    className={cn(fieldControl, 'tabular-nums')}
                  />
                </Field>
                <Field label="Max Tokens" hint="256 – 16384">
                  <input
                    type="number"
                    min={256}
                    max={16384}
                    value={form.maxTokens ?? 2048}
                    onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                    className={cn(fieldControl, 'tabular-nums')}
                  />
                </Field>
              </div>
            </div>
          </form>
        </Drawer>
      )}

      {/* Accessible ConfirmModal instead of window.confirm */}
      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
        tone="danger"
        title={deleting ? `Xóa provider "${deleting.name}"?` : 'Xóa provider?'}
        description={
          deleting
            ? `Cấu hình model ${deleting.modelName} và API key đã mã hóa sẽ bị xóa khỏi chuỗi fallback.`
            : undefined
        }
        confirmLabel="Xóa provider"
        busy={deleteBusy}
        busyLabel="Đang xóa…"
      />
    </div>
  );
}

export default AiProvidersPage;
