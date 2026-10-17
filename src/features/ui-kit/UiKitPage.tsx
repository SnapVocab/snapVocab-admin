import React, { useState } from 'react';
import { Archive, Globe, Plus, Save, Trash2, Edit2 } from 'lucide-react';
import { Badge, BadgeTone, Button, ButtonSize, ButtonVariant } from '../../components/ui';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'danger-outline'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const TONES: { tone: BadgeTone; example: string }[] = [
  { tone: 'neutral', example: 'Bản nháp' },
  { tone: 'info', example: 'Chờ mở bán' },
  { tone: 'success', example: 'Đang mở bán' },
  { tone: 'warning', example: 'Có thay đổi chưa lưu' },
  { tone: 'danger', example: 'Lỗi phát hành' },
];

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="bg-surface border border-border rounded-xl p-5 space-y-3">
    <div>
      <h2 className="text-sm font-bold text-text">{title}</h2>
      {note && <p className="text-xs text-text-muted mt-0.5">{note}</p>}
    </div>
    {children}
  </section>
);

/** Internal (dev-only) reference for the shared UI kit: every variant, size and state in one place. */
export const UiKitPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const fakeSave = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6 space-y-4 min-w-0">
      <div>
        <h1 className="text-xl font-extrabold text-text">UI Kit</h1>
        <p className="text-[13px] text-text-muted">
          src/components/ui · Trang nội bộ, chỉ có ở bản dev. Mỗi khu vực chỉ một nút primary.
        </p>
      </div>

      <Section title="Button · variant × size">
        <div className="grid grid-cols-[120px_repeat(3,auto)] items-center gap-3 w-fit">
          <span />
          {SIZES.map((size) => <span key={size} className="text-xs font-semibold text-text-muted">{size}</span>)}
          {VARIANTS.map((variant) => (
            <React.Fragment key={variant}>
              <span className="text-xs font-mono text-text-muted">{variant}</span>
              {SIZES.map((size) => (
                <Button key={size} variant={variant} size={size} icon={<Save />}>Lưu thay đổi</Button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </Section>

      <Section title="Button · trạng thái" note="Loading giữ nguyên chiều rộng; disabled không có hover; Tab để thấy vòng focus.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<Save />} loading={loading} loadingText="Đang lưu…" onClick={fakeSave}>
            Lưu thay đổi
          </Button>
          <Button variant="primary" icon={<Save />} disabled>Lưu thay đổi</Button>
          <Button icon={<Globe />} disabled>Phát hành</Button>
          <Button variant="danger" icon={<Archive />} loading loadingText="Đang ngừng bán…">Ngừng bán vĩnh viễn</Button>
          <Button icon={<Plus />}>Nhãn rất dài để kiểm tra hành vi xuống dòng của nút trong thanh công cụ</Button>
        </div>
      </Section>

      <Section title="Button · chỉ icon" note="Bắt buộc có label: thành tên truy cập và tooltip.">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Edit2 />} label="Chỉnh sửa" />
          <Button variant="ghost" size="sm" icon={<Globe />} label="Phát hành" />
          <Button variant="danger-outline" icon={<Trash2 />} label="Xóa bản nháp" />
          <Button size="sm" icon={<Save />} label="Đang tải" loading />
        </div>
      </Section>

      <Section title="Editor · thứ bậc nút" note="Lưu = primary; Phát hành đứng cạnh = secondary; danger-outline chỉ mở bước xác nhận.">
        <div className="flex items-center gap-2">
          <Button variant="danger-outline" icon={<Archive />}>Ngừng bán vĩnh viễn</Button>
          <Button icon={<Globe />}>Phát hành</Button>
          <Button variant="primary" icon={<Save />}>Lưu thay đổi</Button>
        </div>
      </Section>

      <Section title="Badge · tone" note="Chỉ mô tả trạng thái, không nhấn được. Module tự ánh xạ trạng thái nghiệp vụ sang tone.">
        <div className="flex flex-wrap items-center gap-2">
          {TONES.map(({ tone, example }) => (
            <span key={tone} className="inline-flex items-center gap-1.5">
              <span className="text-xs font-mono text-text-muted">{tone}</span>
              <Badge tone={tone}>{example}</Badge>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" icon={<Globe />}>Đã phát hành</Badge>
          <Badge icon={<Archive />}>Đã lưu trữ</Badge>
          <Badge tone="info">Nhãn dài: Mở bán 07/10/2026 08:00 (UTC+7)</Badge>
        </div>
      </Section>
    </div>
  );
};

export default UiKitPage;
