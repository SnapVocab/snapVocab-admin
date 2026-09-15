import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Square, Upload, Trash2, Music, Check, RefreshCw, Sliders } from 'lucide-react';
import { CardAudioConfig } from '../../domains/flashcard/types';

interface AudioPreviewTesterProps {
  word: string;
  config: CardAudioConfig;
  onChange: (config: CardAudioConfig) => void;
}

export const AudioPreviewTester: React.FC<AudioPreviewTesterProps> = ({
  word,
  config,
  onChange,
}) => {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isPlayingCustom, setIsPlayingCustom] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [customFileName, setCustomFileName] = useState<string>(
    config.url ? 'custom-pronunciation.mp3' : ''
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Clean up TTS and audio if unmounted
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
      }
    };
  }, []);

  const handlePlayTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt không hỗ trợ Web Speech API.');
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word || 'Từ vựng');
    utterance.lang = config.voice;
    utterance.rate = config.speed;
    utterance.pitch = config.pitch;

    utterance.onstart = () => setIsPlayingTTS(true);
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Vui lòng chọn tệp âm thanh hợp lệ (.mp3, .wav, .m4a, .ogg)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Dung lượng tệp vượt quá 2MB. Vui lòng chọn tệp dung lượng nhỏ hơn.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomFileName(file.name);
    onChange({
      ...config,
      sourceType: 'custom',
      url: objectUrl,
    });
  };

  const handleCustomAudioPlay = () => {
    if (!config.url) return;

    if (isPlayingCustom && customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
      setIsPlayingCustom(false);
      return;
    }

    if (!customAudioRef.current || customAudioRef.current.src !== config.url) {
      customAudioRef.current = new Audio(config.url);
    }

    customAudioRef.current.onended = () => setIsPlayingCustom(false);
    customAudioRef.current.onerror = () => {
      setIsPlayingCustom(false);
      alert('Không thể phát tệp âm thanh này.');
    };

    customAudioRef.current.play()
      .then(() => setIsPlayingCustom(true))
      .catch(() => setIsPlayingCustom(false));
  };

  const handleRemoveCustomAudio = () => {
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    setIsPlayingCustom(false);
    setCustomFileName('');
    onChange({
      ...config,
      sourceType: 'tts',
      url: undefined,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-info-light text-info">
            <Volume2 size={17} />
          </div>
          <div>
            <div className="text-xs font-bold text-text uppercase tracking-wider">
              Phát âm & Giọng đọc
            </div>
            <div className="text-[11px] text-text-muted">
              {config.sourceType === 'tts'
                ? 'Bộ đọc chuẩn Web Speech AI (TTS)'
                : 'File âm thanh chuyên gia tải lên'}
            </div>
          </div>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg text-xs border border-border/60">
          <button
            type="button"
            onClick={() => onChange({ ...config, sourceType: 'tts' })}
            className={`px-3 py-1 rounded-md transition-all font-semibold ${
              config.sourceType === 'tts'
                ? 'bg-surface text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Bộ đọc AI (TTS)
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...config, sourceType: 'custom' })}
            className={`px-3 py-1 rounded-md transition-all font-semibold ${
              config.sourceType === 'custom'
                ? 'bg-surface text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            File tải lên
          </button>
        </div>
      </div>

      {config.sourceType === 'tts' ? (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* TTS Play Button */}
            <button
              type="button"
              onClick={handlePlayTTS}
              disabled={!word?.trim()}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPlayingTTS
                  ? 'bg-danger text-white ring-2 ring-danger/30'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-xs'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isPlayingTTS ? (
                <Square size={13} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
              <span>{isPlayingTTS ? 'Dừng phát' : 'Nghe thử TTS'}</span>
            </button>

            {/* Voice select */}
            <select
              value={config.voice}
              onChange={(e) =>
                onChange({ ...config, voice: e.target.value as 'en-US' | 'en-GB' })
              }
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="en-US">English (US - Chuẩn Mỹ)</option>
              <option value="en-GB">English (UK - Chuẩn Anh)</option>
            </select>

            {/* Speed select */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-text-muted font-medium">Tốc độ:</span>
              {[0.8, 1.0, 1.2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ ...config, speed: s })}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                    config.speed === s
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:bg-surface-subtle'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-subtle"
              title="Tùy chỉnh cao độ (Pitch)"
              aria-label="Tùy chỉnh cao độ"
            >
              <Sliders size={14} />
            </button>
          </div>

          {showAdvanced && (
            <div className="p-2.5 bg-surface-subtle rounded-lg flex items-center gap-3 text-xs border border-border/50">
              <span className="text-text-muted font-medium">Cao độ (Pitch):</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={config.pitch}
                onChange={(e) =>
                  onChange({ ...config, pitch: parseFloat(e.target.value) })
                }
                className="w-36 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono text-xs text-text font-bold">
                {config.pitch}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* CUSTOM AUDIO UPLOADER */
        <div className="space-y-2.5 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/m4a,audio/ogg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {config.url ? (
            /* Uploaded audio player */
            <div className="p-3 bg-surface-subtle rounded-xl border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <Music size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text truncate">
                    {customFileName || 'Tệp phát âm riêng'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Check size={12} /> Đã nạp thành công vào bộ nhớ
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCustomAudioPlay}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPlayingCustom
                      ? 'bg-danger text-white ring-2 ring-danger/30'
                      : 'bg-primary text-white hover:bg-primary-hover shadow-xs'
                  }`}
                >
                  {isPlayingCustom ? (
                    <Square size={13} fill="currentColor" />
                  ) : (
                    <Play size={13} fill="currentColor" />
                  )}
                  <span>{isPlayingCustom ? 'Dừng' : 'Phát file'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface"
                  title="Thay thế file khác"
                  aria-label="Thay thế file khác"
                >
                  <RefreshCw size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleRemoveCustomAudio}
                  className="p-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger-light"
                  title="Gỡ bỏ file audio"
                  aria-label="Gỡ bỏ file audio"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Dropzone when no file yet */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary-light/30'
                  : 'border-border hover:border-primary/50 bg-surface-subtle/40 hover:bg-surface-subtle/80'
              }`}
            >
              <Upload size={22} className="mx-auto text-primary mb-1.5 animate-bounce" />
              <p className="text-xs text-text font-bold">
                Kéo thả file âm thanh hoặc <span className="text-primary underline">bấm để chọn file</span>
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Hỗ trợ định dạng .mp3, .wav, .m4a (Tối đa 2MB, âm thanh rõ nét)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

