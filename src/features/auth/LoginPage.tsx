import React, { useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Field, fieldControl } from '../../components/ui';
import { Wordmark } from '../../components/brand/BrandIcons';
import { showMockScreens } from '../../components/layout/nav';
import { useAuth } from '../../domains/auth/use-auth';
import { validateLogin } from '../../domains/auth/auth-service';
import { cn } from '../../lib/utils';

interface LoginPageProps {
  onSuccess?: () => void;
}

/** One sentence the person signing in can act on. */
function loginErrorMessage(err: { code?: string; statusCode?: number; message?: string } | undefined): string {
  if (err?.code === 'FORBIDDEN_NOT_ADMIN' || err?.statusCode === 403) return 'Tài khoản này không có quyền quản trị.';
  if (err?.code === 'INVALID_CREDENTIALS' || err?.statusCode === 401) return 'Email hoặc mật khẩu không đúng.';
  if (err?.code === 'ACCOUNT_NOT_ACTIVATED') return 'Tài khoản chưa kích hoạt email.';
  if (err?.code === 'NETWORK_ERROR' || err?.statusCode === 0) return 'Không kết nối được máy chủ. Thử lại sau ít phút.';
  return err?.message || 'Đăng nhập không thành công. Thử lại.';
}

/*
 * The brand side shows the product doing its one job: Snapy, the app's mascot, as the AI scan sees him.
 * Box, tag and result card copy the mobile scan screen (SnapVocab/src/features/scan: detection-image,
 * detected-item-card, display.BOX_COLORS); word, IPA and meaning are the "fox" entry of the SnapVocab dictionary.
 */
const DETECTIONS = [
  // Position in % of snapy-full.png (306×424).
  { label: 'fox', color: '#1CB0F6', box: { left: -1, top: 1, width: 102, height: 98 } },
  { label: 'book', color: '#58CC02', box: { left: 17, top: 62, width: 28, height: 22 } },
  { label: 'camera', color: '#A560F8', box: { left: 47, top: 67, width: 18, height: 11 } },
];

/** The mobile app's own headline (SnapVocab vi.json `welcome.title`). */
const HEADLINE = 'Học tiếng Anh từ thế giới xung quanh bạn';

const ScanVignette: React.FC = () => (
  <figure className="m-0 flex flex-col items-center">
    <div className="relative">
      <img src="/brand/snapy-full.png" alt="" className="h-[min(340px,42vh)] w-auto select-none" draggable={false} />
      {DETECTIONS.map(({ label, color, box }) => (
        <span key={label} className="absolute rounded-[6px] border-2" style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`, borderColor: color }}>
          <span className="absolute -left-0.5 -top-[18px] rounded-t-md px-1.5 py-0.5 text-[11px] font-bold leading-[14px] text-white" style={{ backgroundColor: color }}>{label}</span>
        </span>
      ))}
    </div>
    <figcaption className="relative -mt-10 ml-24 flex w-[280px] overflow-hidden rounded-3xl border-2 border-b-4 border-neutral-100 bg-white">
      <span className="w-1.5 shrink-0" style={{ backgroundColor: DETECTIONS[0].color }} />
      <span className="flex-1 p-4">
        <span className="flex items-start gap-3">
          <span className="flex-1 text-2xl font-extrabold leading-8 text-[#1E2A44]">fox</span>
          <span className="mt-1 flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: '#58CC0266', backgroundColor: '#58CC021A' }}>
            <span className="h-2 w-2 rounded-full bg-[#58CC02]" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-700">Độ tin cậy cao</span>
          </span>
        </span>
        <span className="mt-1 block">
          <span className="mr-2 text-[15px] text-neutral-500">/fɑks/</span>
          <span className="text-[15px] font-bold text-neutral-800">Con cáo.</span>
        </span>
      </span>
    </figcaption>
  </figure>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const invalid = validateLogin(email, password);
    setErrors(invalid);
    setGeneralError(null);
    if (invalid.email || invalid.password) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      onSuccess?.();
    } catch (err) {
      setGeneralError(loginErrorMessage(err as { code?: string; statusCode?: number; message?: string }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-surface text-text lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside aria-hidden className="hidden flex-col justify-between overflow-hidden bg-snapy-light px-12 py-10 lg:flex">
        <Wordmark />
        <div className="space-y-12">
          <p className="max-w-[400px] text-[32px] font-semibold leading-[1.15] tracking-tight text-[#1E2A44]">{HEADLINE}</p>
          <ScanVignette />
        </div>
        <p className="text-xs text-text-muted">Một lượt quét trong ứng dụng SnapVocab.</p>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
        {/* Narrow screens: no room for the scan picture, the brand stays as a band above the form. */}
        <div className="-mx-6 -mt-8 bg-snapy-light px-6 pb-7 pt-8 sm:-mx-12 sm:px-12 lg:hidden">
          <Wordmark />
          <p className="mt-6 max-w-[320px] text-xl font-semibold leading-snug tracking-tight text-[#1E2A44]">{HEADLINE}</p>
        </div>
        <div className="my-auto w-full max-w-[360px] self-center py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="mt-1.5 text-body text-text-muted">Dành cho tài khoản được cấp quyền quản trị.</p>

          {generalError && (
            <div role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-light px-3 py-2.5 text-body text-danger-dark">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form ref={form} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
                disabled={isSubmitting}
                autoComplete="username"
                autoFocus
                className={cn(fieldControl, 'h-10 text-sm')}
              />
            </Field>
            <Field
              label="Mật khẩu"
              error={errors.password}
              hint={capsLock ? 'Caps Lock đang bật.' : undefined}
              addon={(
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              )}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                disabled={isSubmitting}
                autoComplete="current-password"
                className={cn(fieldControl, 'h-10 pr-14 text-sm')}
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} loadingText="Đang đăng nhập…">
              Đăng nhập
            </Button>
          </form>
        </div>
        {showMockScreens && <p className="text-xs text-text-light">Bản dev: các màn chạy dữ liệu mẫu có chữ “mẫu” trên thanh bên.</p>}
      </main>
    </div>
  );
};
