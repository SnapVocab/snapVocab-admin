import React from 'react';
import { ContentPipelineProjection } from '../../../domains/dashboard/types';
import { ArrowRight, BookOpen, Volume2, Image as ImageIcon } from 'lucide-react';

interface ContentPipelineWidgetProps {
  pipeline: ContentPipelineProjection;
  onNavigate?: (navId: string) => void;
}

export const ContentPipelineWidget: React.FC<ContentPipelineWidgetProps> = ({
  pipeline,
  onNavigate,
}) => {
  const { byStatus, byCefr, totalWords } = pipeline;
  const safeTotal = totalWords > 0 ? totalWords : 1;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-light text-primary flex items-center justify-center select-none">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Content Studio Pipeline & CEFR</h3>
              <p className="text-xs text-text-muted">
                Quy trình vòng đời từ vựng & phân bổ chuẩn CEFR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('content-studio')}
            aria-label="Mở Content Studio"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1.5 py-0.5 select-none"
          >
            <span>Content Studio</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* State Machine Status Flow: Responsive 2-col on mobile, 4-col on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3.5">
          <div className="bg-surface-subtle border border-border rounded-lg p-2.5 text-center">
            <div className="text-xs text-text-muted font-medium select-none">Draft (Nháp)</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 select-text">
              {byStatus.draft}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('content-studio')}
            aria-label={`Duyệt ${byStatus.review} từ đang chờ kiểm tra trong Content Studio`}
            className="bg-info-light border border-info/30 rounded-lg p-2.5 text-center hover:border-info transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-info focus-visible:outline-none"
          >
            <div className="text-xs text-info font-bold flex items-center justify-center gap-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
              In Review
            </div>
            <div className="text-base font-bold font-mono text-info mt-0.5 select-text">
              {byStatus.review}
            </div>
          </button>

          <div className="bg-primary-light border border-primary/30 rounded-lg p-2.5 text-center">
            <div className="text-xs text-primary font-bold select-none">Published</div>
            <div className="text-base font-bold font-mono text-primary mt-0.5 select-text">
              {byStatus.published.toLocaleString('vi-VN')}
            </div>
          </div>

          <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-2.5 text-center">
            <div className="text-xs text-text-muted font-medium select-none">Archived</div>
            <div className="text-base font-bold font-mono text-text-muted mt-0.5 select-text">
              {byStatus.archived}
            </div>
          </div>
        </div>

        {/* CEFR Level Matrix Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-text-light uppercase tracking-wider mb-1 select-none">
            Phân bổ trình độ & Độ phủ Media / TTS
          </div>

          <div className="divide-y divide-border/60 text-xs">
            {byCefr.map((row) => {
              const proportionPercent = ((row.count / safeTotal) * 100).toFixed(1);

              return (
                <div
                  key={row.level}
                  className="py-2 flex items-center justify-between gap-2 hover:bg-surface-subtle/50 px-1 rounded transition-colors"
                >
                  {/* Level badge & count */}
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <span
                      className="text-xs font-bold font-mono px-2 py-0.5 rounded border select-none"
                      style={{
                        backgroundColor: `${row.color}15`,
                        color: row.color,
                        borderColor: `${row.color}30`,
                      }}
                    >
                      {row.level}
                    </span>
                    <span className="font-mono text-xs font-semibold text-text select-text">
                      {row.count} từ
                    </span>
                    <span className="font-mono text-[11px] text-text-muted select-text">
                      ({proportionPercent}%)
                    </span>
                  </div>

                  {/* Progress bar representing true proportion */}
                  <div className="flex-1 bg-surface-subtle h-2 rounded-full overflow-hidden select-none">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${proportionPercent}%`,
                        backgroundColor: row.color,
                      }}
                      title={`Tỷ lệ: ${proportionPercent}% trên tổng số ${totalWords} từ`}
                    />
                  </div>

                  {/* Audio and Image coverage icons */}
                  <div className="flex items-center gap-3 w-28 justify-end text-xs text-text-muted font-mono select-text">
                    <span className="flex items-center gap-1" title="Độ phủ phát âm audio TTS">
                      <Volume2 size={12} className="text-info select-none" />
                      {row.ttsPercent}%
                    </span>
                    <span className="flex items-center gap-1" title="Độ phủ ảnh minh họa">
                      <ImageIcon size={12} className="text-snapy select-none" />
                      {row.mediaPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Deep Link Button */}
      <div className="mt-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => onNavigate?.('content-studio')}
          aria-label={`Kiểm duyệt ${byStatus.review} từ chờ duyệt trong Content Studio`}
          className="w-full py-2 px-3 bg-surface-subtle hover:bg-primary-light text-text hover:text-primary rounded-lg text-xs font-semibold transition-all border border-border flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <span>Kiểm duyệt {byStatus.review} từ chờ duyệt trong Content Studio</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

