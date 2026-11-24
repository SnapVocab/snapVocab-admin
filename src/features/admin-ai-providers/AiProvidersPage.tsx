import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Edit3,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
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

interface ProviderPreset {
  label: string;
  name: string;
  providerType: AiProviderType;
  baseUrl: string;
  defaultModel: string;
}

const PRESETS: ProviderPreset[] = [
  {
    label: 'Google Gemini',
    name: 'Google Gemini',
    providerType: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
  },
  {
    label: 'Groq Cloud',
    name: 'Groq Cloud',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
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
    label: 'DeepSeek',
    name: 'DeepSeek',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  {
    label: 'Ollama / Custom',
    name: 'Ollama Local',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
  },
];

const EMPTY_FORM: UpsertAiProviderRequest = {
  name: 'Google Gemini',
  providerType: 'GEMINI',
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  modelName: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 2048,
  timeoutMs: 20000,
  enabled: true,
  priority: 1,
};

export function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProviderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Editor modal / drawer state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AiProviderDTO | null>(null);
  const [form, setForm] = useState<UpsertAiProviderRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Dynamic model list fetcher state
  const [models, setModels] = useState<AiModelOptionDTO[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  // Per-row test results
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestAiProviderResponse>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAiProviders();
      setProviders(data);
    } catch (e) {
      setError((e as Error).message || 'Không tải được danh sách AI Provider');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, priority: providers.length + 1 });
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
    setModels([]);
    setModelsError(null);
    setModelSearch('');
    setEditorOpen(true);
  };

  const applyPreset = (preset: ProviderPreset) => {
    setForm((prev) => ({
      ...prev,
      name: preset.name,
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
        showToast(`Đã tải ${fetched.length} model từ ${form.name}`);
      }
    } catch (e) {
      setModelsError((e as Error).message || 'Không tải được danh sách model (kiểm tra API key / Base URL)');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAiProvider(editing.id, form);
        showToast('Đã cập nhật cấu hình AI Provider');
      } else {
        await createAiProvider(form);
        showToast('Đã thêm AI Provider mới');
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (p: AiProviderDTO) => {
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
      await load();
    } catch (err) {
      setError((err as Error).message || 'Không đổi được trạng thái');
    }
  };

  const handleDelete = async (p: AiProviderDTO) => {
    if (!window.confirm(`Xóa AI Provider "${p.name}" (${p.modelName})?`)) return;
    try {
      await deleteAiProvider(p.id);
      showToast(`Đã xóa ${p.name}`);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Xóa thất bại');
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await testAiProvider(id);
      setTestResults((prev) => ({ ...prev, [id]: res }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, error: (err as Error).message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Cpu size={14} />
            Hệ thống · Multi-Provider LLM Gateway
          </div>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Cấu hình AI Providers</h1>
          <p className="mt-1 text-sm text-text-muted">
            Quản lý model cho AI Context Story (tối đa 20 từ/truyện). Khi provider ưu tiên #1 lỗi hoặc hết quota, hệ thống tự động fallback sang #2.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-text-primary hover:bg-surface-hover"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm hover:opacity-90"
          >
            <Plus size={16} />
            Thêm Provider
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Provider Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-text-muted">
            <Loader2 size={20} className="mr-2 animate-spin" />
            Đang tải cấu hình AI Providers…
          </div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-bold text-text-primary">Chưa có AI Provider nào trong DB</p>
            <p className="mt-1 text-sm text-text-muted">
              Thêm Google Gemini, Groq, OpenAI, OpenRouter hoặc Ollama để bật tính năng AI Story Lab.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white"
            >
              <Plus size={16} />
              Thêm Provider đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-5 py-3 font-bold">Ưu tiên</th>
                  <th className="px-4 py-3 font-bold">Provider & Model</th>
                  <th className="px-4 py-3 font-bold">Adapter / Base URL</th>
                  <th className="px-4 py-3 font-bold">API Key</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {providers.map((p) => {
                  const testRes = testResults[p.id];
                  return (
                    <tr key={p.id} className={p.enabled ? '' : 'opacity-60'}>
                      <td className="px-5 py-4 font-extrabold tabular-nums text-text-primary">#{p.priority}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-text-primary">{p.name}</div>
                        <div className="font-mono text-xs text-text-muted">{p.modelName}</div>
                        {testRes && (
                          <div className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${testRes.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {testRes.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {testRes.ok ? `Kết nối OK (${testRes.latencyMs}ms)` : `Lỗi: ${testRes.error}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md bg-surface-subtle px-2 py-0.5 text-xs font-bold text-text-primary">
                          {p.providerType}
                        </span>
                        <div className="mt-1 max-w-xs truncate font-mono text-xs text-text-muted">{p.baseUrl}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-text-muted">
                        {p.hasApiKey ? p.maskedApiKey : <span className="italic">Không có key</span>}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void handleToggleEnabled(p)}
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            p.enabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {p.enabled ? 'Đang bật' : 'Tạm tắt'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={testingId === p.id}
                            onClick={() => void handleTest(p.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50"
                          >
                            {testingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                            Test
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-hover"
                          >
                            <Edit3 size={13} />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(p)}
                            className="inline-flex h-8 items-center rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-black text-text-primary">
                {editing ? `Chỉnh sửa: ${editing.name}` : 'Thêm AI Provider mới'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-bold text-text-muted hover:bg-surface-hover"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Chọn nhanh Preset</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-xl border border-border bg-surface-subtle px-3 py-1.5 text-xs font-bold text-text-primary hover:border-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-text-muted">Tên hiển thị *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text-primary"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-text-muted">Loại Adapter *</span>
                  <select
                    value={form.providerType}
                    onChange={(e) => setForm({ ...form, providerType: e.target.value as AiProviderType })}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text-primary"
                  >
                    <option value="GEMINI">GEMINI (Google AI Studio)</option>
                    <option value="OPENAI_COMPATIBLE">OPENAI_COMPATIBLE (OpenAI / Groq / OpenRouter / Ollama)</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-text-muted">Base URL *</span>
                <input
                  required
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 font-mono text-xs text-text-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-text-muted">
                  API Key {editing ? '(để trống nếu giữ nguyên key cũ)' : ''}
                </span>
                <input
                  type="password"
                  placeholder={editing?.maskedApiKey || 'Nhập API Key…'}
                  value={form.apiKey ?? ''}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 font-mono text-xs text-text-primary"
                />
              </label>

              {/* Dynamic Model Picker */}
              <div className="space-y-2 rounded-xl border border-border bg-surface-subtle p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">Model Name *</span>
                  <button
                    type="button"
                    disabled={loadingModels}
                    onClick={() => void handleFetchModels()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {loadingModels ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Tải danh sách model từ API
                  </button>
                </div>

                <input
                  required
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  placeholder="Chọn từ danh sách bên dưới hoặc nhập thủ công…"
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 font-mono text-xs text-text-primary"
                />

                {modelsError && <p className="text-xs font-semibold text-rose-600">{modelsError}</p>}

                {models.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
                      <input
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder={`Tìm trong ${models.length} model…`}
                        className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-text-primary"
                      />
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-1.5">
                      {filteredModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setForm({ ...form, modelName: m.id })}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs ${
                            form.modelName === m.id
                              ? 'bg-primary/10 font-bold text-primary'
                              : 'hover:bg-surface-hover text-text-primary'
                          }`}
                        >
                          <span className="font-mono">{m.id}</span>
                          {m.displayName !== m.id && (
                            <span className="ml-2 truncate text-[11px] text-text-muted">{m.displayName}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-text-muted">Ưu tiên (1 = chính)</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={form.priority ?? 1}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-text-muted">Temperature</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={form.temperature ?? 0.7}
                    onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-text-muted">Max Tokens</span>
                  <input
                    type="number"
                    min={256}
                    max={16384}
                    value={form.maxTokens ?? 2048}
                    onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-text-primary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? 'Lưu thay đổi' : 'Tạo Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiProvidersPage;

