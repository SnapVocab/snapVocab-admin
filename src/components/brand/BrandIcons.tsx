import React from 'react';

/** "SnapVocab Admin" with Snapy, the app's mascot (public/brand/snapy.png, copied from the mobile assets). Sidebar and login. */
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
    <img src="/brand/snapy.png" alt="" className="h-8 w-auto" />
    <span className="text-sm font-semibold tracking-tight text-text">SnapVocab <span className="font-normal text-text-muted">Admin</span></span>
  </span>
);

/**
 * SnapVocab brand marks for economy / LiveOps surfaces, ported from the mobile set
 * (SnapVocab/src/components/ui/icons). Functional icons (search, edit, chevrons…) stay Lucide.
 */
interface BrandIconProps {
  size?: number;
  className?: string;
}

const box = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  className,
  'aria-hidden': true,
});

/** 3D gold coin (mobile coin.tsx). */
export const CoinIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg {...box(size, className)}>
    <circle cx="12" cy="13" r="10" fill="#B45309" />
    <circle cx="12" cy="11.5" r="10" fill="#F59E0B" />
    <circle cx="12" cy="11.5" r="7.5" fill="#FBBF24" />
    <circle cx="12" cy="11.5" r="6" stroke="#D97706" strokeWidth={1} strokeDasharray="2 1.5" />
    <path d="M12 7.5L13.2 10.2L16 10.5L13.8 12.4L14.5 15.2L12 13.8L9.5 15.2L10.2 12.4L8 10.5L10.8 10.2L12 7.5Z" fill="#D97706" />
    <path d="M7.5 7.5C9 5.5 11.5 4.5 14 4.8" stroke="#FEF08A" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

/** XP energy orb (mobile rewards/xp-orb-3d.tsx). Gradient ids are per instance: several orbs share one page. */
export const XpIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1CB0F6" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#A855F7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="25%" stopColor="#38BDF8" />
          <stop offset="65%" stopColor="#1CB0F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}g)`} />
      <circle cx="32" cy="32" r="25" fill={`url(#${id}b)`} stroke="#0284C7" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="18" fill={`url(#${id}c)`} opacity="0.85" />
      <path d="M34 15.5 L20 35.5 L31 35.5 L26 51.5 L44 29.5 L33 29.5 Z" fill="#0284C7" opacity="0.35" />
      <path d="M34 14 L20 34 L31 34 L26 50 L44 28 L33 28 Z" fill={`url(#${id}l)`} stroke="#B45309" strokeWidth="0.8" />
      <circle cx="24" cy="22" r="4.5" fill="#FFFFFF" opacity="0.75" />
      <circle cx="21" cy="26" r="1.5" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
};

/** XP Booster bolt (mobile zap.tsx). */
export const BoosterIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg {...box(size, className)}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#F59E0B" stroke="#D97706" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Shop theme sparkles (mobile sparkles.tsx), violet like the theme artwork tint. */
export const ThemeIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg {...box(size, className)}>
    <path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6L9 3z" fill="#8B5CF6" />
    <path d="M17.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" fill="#C4B5FD" />
  </svg>
);

/** Streak Freeze snowflake, sky like the item's artwork tint (streak_freeze.md). */
export const FreezeIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg {...box(size, className)}>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke="#0EA5E9" strokeWidth={2} strokeLinecap="round" />
    <path d="M9 4l3 2 3-2M9 20l3-2 3 2M4.2 11l1.3 1 -1.3 1M19.8 11l-1.3 1 1.3 1" stroke="#7DD3FC" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Avatar frame: gold ring around an avatar dot. */
export const FrameIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg {...box(size, className)}>
    <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth={3} />
    <circle cx="12" cy="12" r="9" stroke="#FEF08A" strokeWidth={1} strokeDasharray="3 4" />
    <circle cx="12" cy="12" r="5" fill="#475569" />
  </svg>
);

/** 3D Streak flame (SnapVocab mobile flame.tsx). */
export const StreakFlameIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}f1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#EA384D" />
        </linearGradient>
        <linearGradient id={`${id}f2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE600" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <path
        d="M12 2C12 2 15.5 6.5 15.5 10C15.5 10.6 15.4 11.2 15.1 11.7C16.2 11.1 17 9.9 17 8.5C18.8 10.4 20 13 20 15.8C20 19.8 16.4 23 12 23C7.6 23 4 19.8 4 15.8C4 11.4 8.5 6.5 12 2Z"
        fill={`url(#${id}f1)`}
      />
      {/* Inner flame core */}
      <path
        d="M12 9.5C12 9.5 14 12 14 14.5C14 15.9 13.1 17 12 17C10.9 17 10 15.9 10 14.5C10 12 12 9.5 12 9.5Z"
        fill={`url(#${id}f2)`}
      />
    </svg>
  );
};

/** 3D Snapy Fox mascot icon. */
export const SnapyIcon: React.FC<BrandIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
    {/* Ears */}
    <path d="M7 6L13 15L5 16L7 6Z" fill="#E07A00" stroke="#B45309" strokeWidth="0.8" />
    <path d="M8 8L12 14L7 15L8 8Z" fill="#FEF3C7" />
    <path d="M25 6L19 15L27 16L25 6Z" fill="#E07A00" stroke="#B45309" strokeWidth="0.8" />
    <path d="M24 8L20 14L25 15L24 8Z" fill="#FEF3C7" />
    {/* Head */}
    <ellipse cx="16" cy="18" rx="11" ry="9" fill="#FF8A00" />
    {/* White cheek patches */}
    <path d="M6 18C6 22 10 25 16 26C11 25 7 21 6 18Z" fill="#FFFBEB" />
    <path d="M26 18C26 22 22 25 16 26C21 25 25 21 26 18Z" fill="#FFFBEB" />
    <ellipse cx="12" cy="20" rx="3.5" ry="3.5" fill="#FFFFFF" />
    <ellipse cx="20" cy="20" rx="3.5" ry="3.5" fill="#FFFFFF" />
    {/* Eyes */}
    <ellipse cx="12.5" cy="17" rx="1.5" ry="2" fill="#1E293B" />
    <ellipse cx="19.5" cy="17" rx="1.5" ry="2" fill="#1E293B" />
    <circle cx="13" cy="16.5" r="0.6" fill="#FFFFFF" />
    <circle cx="20" cy="16.5" r="0.6" fill="#FFFFFF" />
    {/* Nose */}
    <path d="M15 21L17 21L16 22.5L15 21Z" fill="#1E293B" />
  </svg>
);

/** 3D Reward Gift icon. */
export const RewardGiftIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    {/* Box body */}
    <rect x="3" y="10" width="18" height="11" rx="2" fill="#FFC42E" stroke="#D97706" strokeWidth="1" />
    {/* Box lid */}
    <rect x="2" y="7" width="20" height="4" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
    {/* Ribbon vertical */}
    <rect x="10.5" y="7" width="3" height="14" fill="#EF4444" />
    {/* Ribbon bow */}
    <path d="M12 7C10 4 6 5 8 7C9.5 7 11.5 7 12 7Z" fill="#DC2626" />
    <path d="M12 7C14 4 18 5 16 7C14.5 7 12.5 7 12 7Z" fill="#DC2626" />
    <circle cx="12" cy="7" r="1.5" fill="#FEE2E2" />
  </svg>
);

/** 3D Badge Medal icon. */
export const BadgeMedalIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    {/* Ribbon */}
    <path d="M8 2L6 11L10 9L12 11L14 9L18 11L16 2H8Z" fill="#1CB0F6" stroke="#0284C7" strokeWidth="0.8" />
    <path d="M10 2L9 8L12 9.5L15 8L14 2H10Z" fill="#0EA5E9" />
    {/* Gold medal */}
    <circle cx="12" cy="14" r="7" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
    <circle cx="12" cy="14" r="5.5" fill="#FFC42E" />
    {/* Star mark */}
    <path d="M12 11L13 13L15.5 13.3L13.6 15L14.2 17.5L12 16.2L9.8 17.5L10.4 15L8.5 13.3L11 13L12 11Z" fill="#D97706" />
  </svg>
);

/** 3D AI Scan Lens icon. */
export const ScanLensIcon: React.FC<BrandIconProps> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    {/* Brackets */}
    <path d="M4 8V5C4 4.4 4.4 4 5 4H8" stroke="#FF8A00" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 4H19C19.6 4 20 4.4 20 5V8" stroke="#FF8A00" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 16V19C20 19.6 19.6 20 19 20H16" stroke="#FF8A00" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 20H5C4.4 20 4 19.6 4 19V16" stroke="#FF8A00" strokeWidth="2" strokeLinecap="round" />
    {/* Lens center */}
    <circle cx="12" cy="12" r="4" fill="#FFF3E6" stroke="#FF8A00" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2" fill="#E07A00" />
    <circle cx="13" cy="11" r="0.8" fill="#FFFFFF" />
  </svg>
);
