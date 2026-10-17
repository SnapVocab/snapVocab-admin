import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../domains/auth/use-auth';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập email.');
      isValid = false;
    } else {
      // Basic email regex RFC 5322 compliance
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Email không đúng định dạng.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      await login({
        email: email.trim(),
        password,
      });
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === 'FORBIDDEN_NOT_ADMIN' || err?.statusCode === 403) {
        setGeneralError('Tài khoản không có quyền truy cập hệ thống quản trị.');
      } else if (err?.code === 'INVALID_CREDENTIALS' || err?.statusCode === 401) {
        setGeneralError('Email hoặc mật khẩu không chính xác.');
      } else if (err?.code === 'ACCOUNT_NOT_ACTIVATED') {
        setGeneralError('Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.');
      } else if (err?.code === 'NETWORK_ERROR' || err?.statusCode === 0) {
        setGeneralError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
      } else {
        setGeneralError(err?.message || 'Đăng nhập không thành công, vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between items-center p-4 sm:p-6 select-none bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px]">
      {/* Top spacer for balanced vertical positioning */}
      <div className="hidden sm:block sm:h-2" aria-hidden="true" />

      {/* Main Container - compact, deliberate console card */}
      <div className="w-full max-w-[440px] my-auto py-6 space-y-4">
        {/* Main Card */}
        <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          {/* Brand Header - compact, clean typography, no false status dot */}
          <div className="flex flex-col items-center text-center space-y-2.5 pb-4 border-b border-border/60">
            {/* Mascot Snapy - deliberate, static brand mark */}
            <div className="w-12 h-12 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-center justify-center text-2xl select-none">
              🦊
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-2">
                <span className="font-extrabold text-base text-text tracking-tight">SnapVocab</span>
                <span className="text-neutral-300 select-none">·</span>
                <span className="text-xs font-mono font-medium tracking-wide text-neutral-500 uppercase">
                  Admin Console
                </span>
              </div>
              <div className="text-xs text-text-muted">
                Studio & LiveOps Console
              </div>
            </div>
          </div>

          {/* Form Context Heading */}
          <div className="space-y-1">
            <h1 className="text-sm font-bold text-text">Đăng nhập quản trị</h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Sử dụng tài khoản quản trị để truy cập Studio & LiveOps Console.
            </p>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div
              className="p-3 bg-rose-50 border border-rose-200/90 rounded-xl flex items-start gap-2.5 text-xs text-rose-800"
              role="alert"
            >
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{generalError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="text-xs font-semibold text-text flex items-center gap-1"
              >
                <span>Email quản trị</span>
                <span className="text-rose-500" aria-hidden="true">*</span>
              </label>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-light group-focus-within:text-emerald-700 transition-colors">
                  <Mail size={15} />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="admin@snapvocab.com"
                  autoComplete="email"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'admin-email-error' : undefined}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border bg-neutral-50/40 hover:bg-neutral-50/80 focus:bg-surface text-text placeholder:text-neutral-400 transition-all focus:outline-none ${
                    emailError
                      ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                      : 'border-border focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                />
              </div>

              {emailError && (
                <p id="admin-email-error" className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-semibold text-text flex items-center gap-1"
                >
                  <span>Mật khẩu</span>
                  <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                {isCapsLockOn && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span>Caps Lock đang bật</span>
                  </span>
                )}
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-light group-focus-within:text-emerald-700 transition-colors">
                  <Lock size={15} />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  onKeyDown={handlePasswordKeyDown}
                  onKeyUp={handlePasswordKeyDown}
                  disabled={isSubmitting}
                  placeholder="Nhập mật khẩu quản trị..."
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'admin-password-error' : undefined}
                  className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border bg-neutral-50/40 hover:bg-neutral-50/80 focus:bg-surface text-text placeholder:text-neutral-400 transition-all focus:outline-none ${
                    passwordError
                      ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                      : 'border-border focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {passwordError && (
                <p id="admin-password-error" className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            {/* Submit CTA - Restrained Admin Emerald */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 mt-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
                  <span>Đang xác thực phiên quản trị...</span>
                </>
              ) : (
                <span>Đăng Nhập Quản Trị</span>
              )}
            </button>
          </form>

          {/* Security Notice - Anchored directly to card */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
            <Shield size={13} className="text-emerald-700 shrink-0" />
            <span>Chỉ dành cho tài khoản quản trị được cấp quyền</span>
          </div>
        </div>

        {/* Operational Version Metadata */}
        <div className="text-center text-[11px] text-neutral-400 font-mono select-none">
          SnapVocab Admin Console · v1.4.2
        </div>
      </div>

      {/* Bottom spacer for balanced vertical positioning */}
      <div className="hidden sm:block sm:h-2" aria-hidden="true" />
    </div>
  );
};
