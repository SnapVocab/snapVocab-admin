import React from 'react';

interface BadgeArtifactProps {
  /** Presigned MinIO URL (or a just-uploaded blob URL); null shows an empty slot, as the app does. */
  imageUrl: string | null;
  /** "locked" is what a learner who has not earned it sees; it never means the badge is switched off. */
  state?: 'earned' | 'locked';
  /** Width and height in px. */
  size?: number;
  focused?: boolean;
}

/** Decorative: the badge name always sits next to it. Same as the app: not yet earned = the art at 35% under a padlock. */
export function BadgeArtifact({ imageUrl, state = 'earned', size = 32, focused = false }: BadgeArtifactProps) {
  const earned = state === 'earned';
  return (
    <span aria-hidden="true" className={`relative inline-grid shrink-0 place-items-center rounded-full ${focused ? 'ring-2 ring-text ring-offset-1' : ''} ${imageUrl ? '' : 'border border-dashed border-border'}`} style={{ width: size, height: size }}>
      {imageUrl && <img src={imageUrl} alt="" width={size} height={size} draggable={false} className="object-contain" style={{ opacity: earned ? 1 : 0.35 }} />}
      {!earned && size >= 40 && (
        <span className="absolute grid h-6 w-6 place-items-center rounded-full border border-white/50 bg-black/60">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><rect x={4} y={11} width={16} height={10} rx={2} /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </span>
      )}
    </span>
  );
}
