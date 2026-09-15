import React, { useState, useEffect } from 'react';
import {
  Mission,
  MissionType,
  MissionCategory,
  MissionActionType,
  MissionTriggerEvent,
  MissionAggregationType,
  MissionDifficulty,
  MissionTargetAudience,
  MissionStatus,
  MissionGuardrailConfig,
  CompletionRule,
  NavigationParams,
} from '../../../domains/missions/types';
import { validateMissionRewardGuardrails } from '../../../domains/missions/selectors';
import {
  getAllCapabilities,
  getCapabilityByAction,
  getSlotCategoryLabel,
  getSlotCategoryBadge,
  MissionCapability,
} from '../../../domains/missions/capabilities';
import {
  X,
  Check,
  AlertTriangle,
  Target,
  Coins,
  ShieldCheck,
  Layers,
  Smartphone,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileText,
  Sliders,
  Compass,
  Award,
  Eye,
  Info,
} from 'lucide-react';

interface MissionFormModalProps {
  isOpen: boolean;
  editingMission: Mission | null;
  guardrailConfig: MissionGuardrailConfig;
  onClose: () => void;
  onSave: (missionData: Partial<Mission>, isOverrideApproved?: boolean) => void;
}

type FormTab = 'basic' | 'rules' | 'navigation' | 'rewards' | 'preview';

export const MissionFormModal: React.FC<MissionFormModalProps> = ({
  isOpen,
  editingMission,
  guardrailConfig,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const capabilities = getAllCapabilities();

  const [formData, setFormData] = useState<Partial<Mission>>({
    code: '',
    title: '',
    description: '',
    type: 'daily',
    category: 'SCAN_CAPTURE',
    actionType: 'SCAN_OBJECT',
    triggerEvent: 'WORD_SCANNED_AND_SAVED',
    aggregationType: 'COUNT',
    completionRule: { requireSavedWord: true, uniqueWordOnly: false },
    navigationParams: { targetScreen: 'CAMERA_SCAN', ctaLabel: 'Mở Camera AI' },
    minimumSupportedClientVersion: 'v1.0.0',
    targetCount: 3,
    unit: 'lượt scan có lưu từ',
    difficulty: 'easy',
    weight: 80,
    status: 'draft', // Luôn mặc định là draft theo BF-15A
    targetAudience: 'all',
    isBonus: false,
    version: 1,
    reward: { xp: 40, coins: 60 },
    auditNotes: '',
  });

  const [overrideApproved, setOverrideApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingMission) {
      setFormData({
        ...editingMission,
        reward: { ...editingMission.reward },
        completionRule: { ...(editingMission.completionRule || {}) },
        navigationParams: { ...(editingMission.navigationParams || { targetScreen: 'HOME_HUB' }) },
      });
      setOverrideApproved(
        (editingMission.reward.coins || 0) > guardrailConfig.maxCoinsCapPerQuest
      );
    } else {
      const randomSuffix = Math.floor(10 + Math.random() * 90);
      const defaultCap = getCapabilityByAction('SCAN_OBJECT');
      setFormData({
        code: `MS-D-${randomSuffix}`,
        title: '',
        description: '',
        type: 'daily',
        category: 'SCAN_CAPTURE',
        actionType: 'SCAN_OBJECT',
        triggerEvent: defaultCap.defaultTriggerEvent,
        aggregationType: defaultCap.defaultAggregation,
        completionRule: { requireSavedWord: true, uniqueWordOnly: false },
        navigationParams: { ...defaultCap.defaultNavigation },
        minimumSupportedClientVersion: 'v1.0.0',
        targetCount: defaultCap.suggestedTargetCount,
        unit: defaultCap.defaultUnit,
        difficulty: 'easy',
        weight: 80,
        status: 'draft', // Mặc định draft
        targetAudience: 'all',
        isBonus: false,
        version: 1,
        reward: { xp: 40, coins: 60 },
        auditNotes: '',
      });
      setOverrideApproved(false);
    }
    setActiveTab('basic');
    setErrorMessage('');
  }, [editingMission, isOpen, guardrailConfig]);

  if (!isOpen) return null;

  const currentCapability = getCapabilityByAction(formData.actionType || 'SCAN_OBJECT');
  const currentReward = formData.reward || { xp: 0, coins: 0 };
  const guardrailValidation = validateMissionRewardGuardrails(
    currentReward,
    guardrailConfig
  );

  // Handle Action Type Switch -> Auto sync capability defaults
  const handleActionTypeChange = (newAction: MissionActionType) => {
    const cap = getCapabilityByAction(newAction);
    setFormData((prev) => {
      const newRule: CompletionRule = {};
      cap.ruleFields.forEach((rf) => {
        (newRule as any)[rf.key] = rf.defaultValue;
      });

      return {
        ...prev,
        actionType: newAction,
        category: prev.isBonus ? prev.category : cap.category,
        triggerEvent: cap.defaultTriggerEvent,
        aggregationType: cap.defaultAggregation,
        unit: cap.defaultUnit,
        targetCount: cap.suggestedTargetCount,
        navigationParams: { ...cap.defaultNavigation },
        minimumSupportedClientVersion: cap.supportedClientVersion,
        completionRule: newRule,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      setErrorMessage('Vui lòng nhập tên tiêu đề nhiệm vụ.');
      setActiveTab('basic');
      return;
    }
    if (!formData.code?.trim()) {
      setErrorMessage('Vui lòng nhập mã nhiệm vụ.');
      setActiveTab('basic');
      return;
    }
    if ((formData.targetCount || 0) <= 0) {
      setErrorMessage('Chỉ tiêu mục tiêu phải lớn hơn 0.');
      setActiveTab('rules');
      return;
    }

    if (!guardrailValidation.isValid && !overrideApproved) {
      setErrorMessage(
        'Phần thưởng vượt trần an toàn. Bạn cần xác nhận ngoại lệ của Super Admin để tiếp tục.'
      );
      setActiveTab('rewards');
      return;
    }

    onSave(formData, overrideApproved);
  };

  const slotBadge = getSlotCategoryBadge(formData.category || 'SCAN_CAPTURE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text">
                  {editingMission ? `Chỉnh Sửa Nhiệm Vụ: ${editingMission.code}` : 'Tạo Nhiệm Vụ Mới'}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  v{formData.version || 1}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {formData.status === 'active' ? 'Active' : 'Draft (Bản nháp)'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Quy trình chuẩn BF-15A: Tạo Draft → Capability Validation → Activation Review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-surface-subtle px-4 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all shrink-0 ${
              activeTab === 'basic'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <FileText size={14} />
            <span>1. Cơ Bản & Slot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all shrink-0 ${
              activeTab === 'rules'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Sliders size={14} />
            <span>2. Rule Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('navigation')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all shrink-0 ${
              activeTab === 'navigation'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Compass size={14} />
            <span>3. Điều Hướng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all shrink-0 ${
              activeTab === 'rewards'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Award size={14} />
            <span>4. Phần Thưởng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all shrink-0 ${
              activeTab === 'preview'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Eye size={14} />
            <span>5. Xem Trước</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 bg-danger-light/50 border border-danger/20 rounded-xl text-danger text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: BASIC & SLOT */}
          {activeTab === 'basic' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Mã Nhiệm Vụ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: MS-D-15"
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-text mb-1">
                    Tiêu Đề Nhiệm Vụ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Quét 3 đồ vật quanh bạn bằng AI Camera"
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Mô Tả / Hướng Dẫn Người Học
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Giải thích rõ ràng điều kiện để học viên nhận thưởng..."
                  className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              {/* Slot Category Selection (BF-12A standard: 5 mandatory slots) */}
              <div className="p-3 bg-surface-subtle border border-border rounded-xl space-y-2">
                <label className="block font-semibold text-text">
                  Phân Loại Nhóm Slot (5 Slot Chuẩn BF-12A)
                </label>
                <select
                  disabled={formData.isBonus}
                  value={formData.category || 'SCAN_CAPTURE'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as MissionCategory,
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-surface text-text font-semibold focus:ring-1 focus:ring-primary"
                >
                  <option value="SCAN_CAPTURE">Slot 1: Scan & Capture (AI Camera)</option>
                  <option value="VOCAB_BUILDING">Slot 2: Xây Dựng Từ Vựng (Topics & Decks)</option>
                  <option value="FLASHCARD_SRS">Slot 3: Flashcard & Ôn Tập SRS (FSRS)</option>
                  <option value="QUIZ_ACCURACY">Slot 4: Quiz & Kiểm Tra Độ Chính Xác</option>
                  <option value="RETENTION_GAMIFICATION">Slot 5: Duy Trì Chuỗi & Gamification Cá Nhân</option>
                </select>

                <div className="pt-2 border-t border-border/70 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBonus || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isBonus: e.target.checked,
                          category: e.target.checked ? 'RETENTION_GAMIFICATION' : formData.category,
                        })
                      }
                      className="rounded border-border text-snapy focus:ring-snapy"
                    />
                    <span className="font-semibold text-text">
                      Đánh dấu là Nhiệm Vụ Thưởng Thêm (+1 Bonus Quest)
                    </span>
                  </label>
                  <span className="text-[10px] text-text-muted">
                    Không tính vào điều kiện mở Daily Chest
                  </span>
                </div>
              </div>

              {/* Row: Audience, Difficulty, Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Độ Khó</label>
                  <select
                    value={formData.difficulty || 'easy'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as MissionDifficulty,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary"
                  >
                    <option value="easy">Dễ (Easy)</option>
                    <option value="medium">Trung Bình (Medium)</option>
                    <option value="hard">Thử Thách (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Đối Tượng Áp Dụng</label>
                  <select
                    value={formData.targetAudience || 'all'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetAudience: e.target.value as MissionTargetAudience,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Tất cả người học</option>
                    <option value="new_users">Người mới (&lt; 7 ngày)</option>
                    <option value="intermediate">Trung cấp (B1-B2)</option>
                    <option value="advanced">Nâng cao (C1-C2)</option>
                    <option value="at_risk_streak">Có nguy cơ đứt Streak</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-text">Trọng Số Pool</label>
                    <span className="text-text-muted font-mono font-bold">{formData.weight}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={formData.weight || 50}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full accent-primary cursor-pointer mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RULES & CAPABILITIES */}
          {activeTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-primary-light/40 border border-primary/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary text-xs">
                  <Sparkles size={14} />
                  <span>Backend Mission Capability Registry (BF-15A)</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Form tự động ràng buộc quan hệ giữa <strong>Action Type</strong>, <strong>Trigger Event</strong> và <strong>Aggregation</strong> để đảm bảo có Event Producer xử lý trên hệ thống.
                </p>
              </div>

              {/* Action Type Selector */}
              <div>
                <label className="block font-semibold text-text mb-1">
                  Hành Động Đã Đăng Ký Trong Registry <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.actionType || 'SCAN_OBJECT'}
                  onChange={(e) => handleActionTypeChange(e.target.value as MissionActionType)}
                  className="w-full p-2.5 rounded-lg border border-border bg-surface text-text font-bold focus:ring-1 focus:ring-primary"
                >
                  {capabilities.map((cap) => (
                    <option key={cap.actionType} value={cap.actionType}>
                      {cap.name} — {cap.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action - Event - Aggregation Binding Display */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-subtle border border-border rounded-xl">
                <div>
                  <label className="block font-semibold text-text mb-1">Trigger Event (Tự động)</label>
                  <select
                    value={formData.triggerEvent}
                    onChange={(e) =>
                      setFormData({ ...formData, triggerEvent: e.target.value as MissionTriggerEvent })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono text-[11px] font-bold"
                  >
                    {currentCapability.allowedEvents.map((evt) => (
                      <option key={evt} value={evt}>
                        {evt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Kiểu Gom Tụ (Aggregation)</label>
                  <select
                    value={formData.aggregationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        aggregationType: e.target.value as MissionAggregationType,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono text-[11px] font-bold"
                  >
                    {currentCapability.allowedAggregations.map((agg) => (
                      <option key={agg} value={agg}>
                        {agg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Count & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Chỉ Tiêu Mục Tiêu (Target Count) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetCount || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCount: Number(e.target.value) })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Đơn Vị Tính (Unit)</label>
                  <input
                    type="text"
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Dynamic Completion Rule Fields */}
              <div className="p-3.5 bg-surface border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-bold text-text">Cấu Hình Điều Kiện Hoàn Thành (Rule Builder)</span>
                  <span className="text-[10px] text-text-muted">Tùy biến theo Action</span>
                </div>

                {currentCapability.ruleFields.length === 0 ? (
                  <p className="text-[11px] text-text-muted italic py-1">
                    Hành động này tính hoàn thành trực tiếp theo số lần ghi nhận event, không yêu cầu filter phụ.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {currentCapability.ruleFields.map((rf) => {
                      const currentValue = (formData.completionRule as any)?.[rf.key];

                      if (rf.type === 'boolean') {
                        return (
                          <label key={rf.key} className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  completionRule: {
                                    ...formData.completionRule,
                                    [rf.key]: e.target.checked,
                                  },
                                })
                              }
                              className="rounded border-border text-primary focus:ring-primary mt-0.5"
                            />
                            <div>
                              <span className="font-semibold text-text block">{rf.label}</span>
                              <span className="text-[10px] text-text-muted">{rf.tooltip}</span>
                            </div>
                          </label>
                        );
                      }

                      if (rf.type === 'number') {
                        return (
                          <div key={rf.key} className="space-y-1">
                            <label className="block font-semibold text-text">{rf.label}</label>
                            <input
                              type="number"
                              value={currentValue ?? rf.defaultValue ?? 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  completionRule: {
                                    ...formData.completionRule,
                                    [rf.key]: Number(e.target.value),
                                  },
                                })
                              }
                              className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-[10px] text-text-muted block">{rf.tooltip}</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NAVIGATION & CLIENT COMPATIBILITY */}
          {activeTab === 'navigation' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
                  <Smartphone size={14} />
                  <span>Nguyên Tắc Điều Hướng An Toàn (BF-12B)</span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  Backend không trả route vật lý hoặc URL. Mobile sử dụng <strong>Action Registry</strong> cục bộ để ánh xạ sang màn hình native.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Màn Hình Đích (Target Screen)</label>
                  <select
                    value={formData.navigationParams?.targetScreen || 'HOME_HUB'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        navigationParams: {
                          ...formData.navigationParams!,
                          targetScreen: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                  >
                    <option value="CAMERA_SCAN">CAMERA_SCAN (Camera Nhận Diện AI)</option>
                    <option value="SRS_REVIEW">SRS_REVIEW (Hàng Đợi Ôn Tập Flashcard)</option>
                    <option value="FLASHCARD_STUDY">FLASHCARD_STUDY (Chủ Đề Từ Vựng)</option>
                    <option value="QUIZ_SETUP">QUIZ_SETUP (Màn Hình Bắt Đầu Quiz)</option>
                    <option value="TOPIC_EXPLORE">TOPIC_EXPLORE (Khám Phá Danh Mục)</option>
                    <option value="STREAK_DETAIL">STREAK_DETAIL (Chi Tiết Chuỗi Streak)</option>
                    <option value="HOME_HUB">HOME_HUB (Màn Hình Trang Chủ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Nhãn Nút CTA Trên Mobile</label>
                  <input
                    type="text"
                    value={formData.navigationParams?.ctaLabel || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        navigationParams: {
                          ...formData.navigationParams!,
                          ctaLabel: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: Mở Camera AI"
                    className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Phiên Bản Ứng Dụng Hỗ Trợ Tối Thiểu
                </label>
                <select
                  value={formData.minimumSupportedClientVersion || 'v1.0.0'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumSupportedClientVersion: e.target.value,
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                >
                  <option value="v1.0.0">v1.0.0 (Tương thích mọi phiên bản)</option>
                  <option value="v1.1.0">v1.1.0 (Yêu cầu tính năng Audio TTS nâng cao)</option>
                  <option value="v1.2.0">v1.2.0 (Yêu cầu AI SAM Background Cutout)</option>
                </select>
                <span className="text-[10px] text-text-muted mt-1 block">
                  Học viên dùng phiên bản thấp hơn sẽ được thông báo cập nhật ứng dụng thay vì crash.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: REWARDS & GUARDRAILS */}
          {activeTab === 'rewards' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-surface-subtle/70 border border-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={15} className="text-[#9A7000]" />
                    <span className="font-bold text-text">Cơ Cấu Phần Thưởng (Rewards)</span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    Trần an toàn: {guardrailConfig.maxCoinsCapPerQuest.toLocaleString()}🪙
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text mb-1">
                      Tiền Xu (Coins) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reward?.coins || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward: { ...formData.reward!, coins: Number(e.target.value) },
                        })
                      }
                      className={`w-full p-2 rounded-lg border bg-surface text-text font-mono font-bold focus:ring-1 ${
                        (formData.reward?.coins || 0) > guardrailConfig.maxCoinsCapPerQuest
                          ? 'border-danger focus:ring-danger text-danger'
                          : 'border-border focus:ring-primary'
                      }`}
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      Tối đa {guardrailConfig.maxCoinsCapPerQuest} Coins/nhiệm vụ
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-text mb-1">Kinh Nghiệm (XP)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reward?.xp || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward: { ...formData.reward!, xp: Number(e.target.value) },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      Tích lũy thăng cấp tài khoản
                    </span>
                  </div>
                </div>

                {/* Guardrail Warning */}
                {!guardrailValidation.isValid && (
                  <div className="p-3 bg-danger-light/40 border border-danger/30 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-start gap-2 text-danger">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">CẢNH BÁO LIVE-OPS GUARDRAILS:</span>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px]">
                          {guardrailValidation.issues.map((iss, i) => (
                            <li key={i}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1.5 border-t border-danger/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideApproved}
                        onChange={(e) => setOverrideApproved(e.target.checked)}
                        className="rounded border-danger text-danger focus:ring-danger"
                      />
                      <span className="text-[11px] font-semibold text-text">
                        Tôi xác nhận mức thưởng này đã được Super Admin phê duyệt ngoại lệ (Whitelisted).
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PREVIEW & DRAFT */}
          {activeTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                  <Check size={14} />
                  <span>Xem Trước Bản Chụp Nhiệm Vụ (Snapshot Preview)</span>
                </div>
                <p className="text-[11px] text-emerald-900/80">
                  Đây là giao diện mô phỏng thẻ nhiệm vụ sẽ hiển thị trong Daily Mission widget trên ứng dụng học viên.
                </p>
              </div>

              {/* Simulated Mobile Card */}
              <div className="p-4 bg-surface border border-border rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${slotBadge.color}`}>
                    {formData.isBonus ? 'Bonus Slot' : slotBadge.label}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-text">
                    <span className="text-amber-500">🪙 +{formData.reward?.coins || 0}</span>
                    <span className="text-primary">✨ +{formData.reward?.xp || 0}XP</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-text">{formData.title || '(Chưa đặt tiêu đề)'}</h4>
                  <p className="text-[11px] text-text-muted mt-0.5">{formData.description || 'Chưa có mô tả chi tiết.'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-[11px] font-mono text-text">
                    Tiến độ: <strong className="text-primary">0 / {formData.targetCount} {formData.unit}</strong>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover flex items-center gap-1 shadow-xs"
                  >
                    <span>{formData.navigationParams?.ctaLabel || 'Bắt đầu'}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Draft Status Note */}
              <div className="p-3 bg-surface-subtle border border-border rounded-xl flex items-start gap-2.5 text-[11px] text-text-muted">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text">Lưu ý về quy trình Draft-First (BF-15A):</strong>
                  <p className="mt-0.5">
                    Nhiệm vụ mới tạo sẽ được lưu ở trạng thái <strong>Draft (Bản nháp)</strong>. Để đưa vào pool luân phiên cho học viên, bạn cần dùng thao tác <strong>Kích hoạt</strong> trên danh sách để chạy pipeline kiểm duyệt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'preview') setActiveTab('rewards');
                    else if (activeTab === 'rewards') setActiveTab('navigation');
                    else if (activeTab === 'navigation') setActiveTab('rules');
                    else if (activeTab === 'rules') setActiveTab('basic');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text hover:bg-surface-subtle flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={13} />
                  <span>Quay lại</span>
                </button>
              )}

              {activeTab !== 'preview' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'basic') setActiveTab('rules');
                    else if (activeTab === 'rules') setActiveTab('navigation');
                    else if (activeTab === 'navigation') setActiveTab('rewards');
                    else if (activeTab === 'rewards') setActiveTab('preview');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-xs font-bold text-primary hover:bg-primary-light flex items-center gap-1 transition-all"
                >
                  <span>Tiếp theo</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-subtle transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Check size={14} />
                <span>{editingMission ? 'Lưu Thay Đổi (v' + (formData.version || 1) + ')' : 'Lưu Bản Nháp (Draft)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
