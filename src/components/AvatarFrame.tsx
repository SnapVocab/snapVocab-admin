import React from 'react';

export interface AvatarFrameProps {
  frameId?: string | null;
  avatarUrl?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  animated?: boolean;
  className?: string;
}

const SIZE_MAP: Record<string, number> = {
  sm: 48,
  md: 68,
  lg: 96,
  xl: 128,
};

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  frameId,
  avatarUrl,
  initials = 'SV',
  size = 'md',
  animated = true,
  className = '',
}) => {
  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 68;
  const avatarDiameter = frameId ? Math.round(dimension * 0.58) : Math.round(dimension * 0.88);

  const frameSrc = frameId ? `/frames/${frameId}.${animated ? 'webp' : 'png'}` : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Avatar Inner */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center bg-slate-800 z-0"
        style={{ width: avatarDiameter, height: avatarDiameter }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-extrabold text-white"
            style={{ fontSize: Math.max(10, Math.round(avatarDiameter * 0.38)) }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Frame Overlay */}
      {frameSrc && (
        <img
          src={frameSrc}
          alt={frameId || 'Frame'}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      )}
    </div>
  );
};
