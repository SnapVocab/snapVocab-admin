import React, { useState } from 'react';
import { Season, SeasonCycleType } from '../../../domains/seasons/types';
import { Calendar, X, Sparkles, AlertCircle } from 'lucide-react';

interface SeasonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (seasonData: Partial<Season>) => void;
  initialData?: Season | null;
}

export const SeasonFormModal: React.FC<SeasonFormModalProps> = (props) => {
  if (!props.isOpen) return null;

  return <SeasonFormModalContent {...props} />;
};

const SeasonFormModalContent: React.FC<SeasonFormModalProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const [code, setCode] = useState(
    initialData?.code || `SEASON_${new Date().getFullYear()}_W${Math.ceil(new Date().getDate() / 7) + 36}`
  );
  const [name, setName] = useState(initialData?.name || 'Mùa Giải Mới: Bứt Phá Mục Tiêu');
  const [description, setDescription] = useState(
    initialData?.description ||
      'Chiến dịch bảng xếp hạng hàng tuần toàn hệ thống SnapVocab. Top 5 mỗi cohort thăng hạng.'
  );
  const [cycleType, setCycleType] = useState<SeasonCycleType>(
    initialData?.cycleType || 'weekly'
  );
  const [theme, setTheme] = useState(initialData?.theme || 'Snapy Autumn Blaze');
  const [startDate, setStartDate] = useState(
    initialData?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate?.split('T')[0] ||
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [timeZone, setTimeZone] = useState(
    initialData?.timeZone || 'Asia/Ho_Chi_Minh (GMT+7)'
  );
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Mã mùa giải và Tên chiến dịch.');
      return;
    }

    onSubmit({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      cycleType,
      theme: theme.trim(),
      startDate: `${startDate}T00:00:00+07:00`,
      endDate: `${endDate}T23:59:59+07:00`,
      timeZone,
      status: initialData?.status || 'upcoming',
      totalParticipants: initialData?.totalParticipants || 0,
      totalCohorts: initialData?.totalCohorts || 0,
      totalXpAccumulated: initialData?.totalXpAccumulated || 0,
      createdBy: 'Operator (Web Admin)',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border bg-canvas flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-text tracking-tight">
                {initialData ? 'Chỉnh Sửa Cấu Hình Mùa Giải' : 'Khởi Tạo Mùa Giải Mới'}
              </h3>
              <p className="text-[11px] text-text-muted">
                Thiết lập chu kỳ, thời gian và chủ đề mùa giải bảng xếp hạng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-danger-light border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Code & Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-text mb-1">
                Mã Mùa Giải (Code) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SEASON_2026_W38"
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-text mb-1">
                Chu Kỳ Giải Đấu
              </label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value as SeasonCycleType)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-semibold text-text focus:outline-none focus:border-primary"
              >
                <option value="weekly">Tuần (Weekly - 7 ngày)</option>
                <option value="monthly">Tháng (Monthly - 30 ngày)</option>
                <option value="special_event">Sự Kiện Đặc Biệt</option>
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-bold text-text mb-1">
              Tên Mùa Giải <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mùa 38: Chinh Phục Cột Mốc"
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-semibold text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block font-bold text-text mb-1">
              Chủ Đề & Mascot Flair
            </label>
            <div className="relative">
              <Sparkles
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-snapy"
              />
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Neon Cyber Sprint, Snapy Autumn..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-canvas font-medium text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-text mb-1">
              Mô Tả Chiến Dịch
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thông điệp hiển thị cho học viên trên ứng dụng mobile..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Dates & Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-text mb-1">
                Ngày Bắt Đầu (00:00)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-text focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-text mb-1">
                Ngày Kết Thúc (23:59)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-text focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-text mb-1">
              Múi Giờ Máy Chủ
            </label>
            <input
              type="text"
              readOnly
              value={timeZone}
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas/60 text-text-muted font-mono"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-canvas border border-border font-semibold text-text text-xs transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-xs"
            >
              {initialData ? 'Lưu Thay Đổi' : 'Tạo Mùa Giải'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
