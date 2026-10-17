import React, { useId } from 'react';

// ponytail: geometry hand-ported from SnapVocab/src/components/snapvocab/achievements/achievement-artifact.tsx (light
// mode only); move both to a shared package if the medal set grows.

type ShapeProps = { fill: string; stroke: string; strokeWidth: number };

function starPoints(count: number, outer: number, inner: number) {
  return Array.from({ length: count * 2 }, (_, i) => {
    const angle = (-90 + (i * 180) / count) * (Math.PI / 180);
    const r = i % 2 === 0 ? outer : inner;
    return `${(32 + r * Math.cos(angle)).toFixed(2)},${(30 + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}
const SEAL = starPoints(8, 29, 25.5);
const HEX = starPoints(3, 28.5, 28.5);

const roundShape = (p: ShapeProps) => <circle cx={32} cy={30} r={27} {...p} />;
const SHAPES: Record<string, (p: ShapeProps) => React.ReactElement> = {
  LONGEST_STREAK_DAYS: roundShape,
  QUIZ_COMPLETED: p => <path d="M32 2.5 L56 10.5 V28 C56 43 45.5 53 32 58.5 C18.5 53 8 43 8 28 V10.5 Z" strokeLinejoin="round" {...p} />,
  PERFECT_QUIZ: p => <polygon points={SEAL} strokeLinejoin="round" {...p} />,
  DISTINCT_WORDS_ADDED: p => <polygon points={HEX} strokeLinejoin="round" {...p} />,
};

// Lucide paths (24 × 24), drawn at 0.8 scale on the medal face.
const EMBLEMS: Record<string, React.ReactElement> = {
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  'clipboard-check': <><rect x={8} y={2} width={8} height={4} rx={1} /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  target: <><circle cx={12} cy={12} r={10} /><circle cx={12} cy={12} r={6} /><circle cx={12} cy={12} r={2} /></>,
  'book-open': <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  award: <><circle cx={12} cy={8} r={6} /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>,
};

const BLANK = { body: '#E8ECF2', edge: '#7C889C', face: '#F1F5F9', emblem: '#64748B', plate: '#FFFFFF', plateText: '#64748B' };

interface BadgeArtifactProps {
  metric: string;
  iconKey: string;
  /** "locked" is what a learner who has not earned it sees; it never means the badge is switched off. */
  state?: 'earned' | 'locked';
  /** Width in px; height follows the medal's 76 × 82 box. */
  size?: number;
  /** Shown on a plate from 56 px up. */
  threshold?: number;
  focused?: boolean;
}

/** Decorative: the badge name always sits next to it. */
export function BadgeArtifact({ metric, iconKey, state = 'earned', size = 32, threshold, focused = false }: BadgeArtifactProps) {
  const gradientId = `bdg${useId().replace(/\W/g, '')}`;
  const earned = state === 'earned';
  const shape = SHAPES[metric] ?? roundShape;
  const emblem = EMBLEMS[iconKey] ?? EMBLEMS.award;
  const plaque = size >= 56 && threshold !== undefined;
  const plateWidth = 12 + 6.4 * String(threshold ?? '').length;
  return (
    <svg width={size} height={Math.round((size * 82) / 76)} viewBox="-6 -8 76 82" aria-hidden="true" focusable="false" className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFE48A" />
          <stop offset="0.55" stopColor="#FFC42E" />
          <stop offset="1" stopColor="#F0A800" />
        </linearGradient>
      </defs>
      {focused && <circle cx={32} cy={30} r={35} fill="none" stroke="#1E2A44" strokeWidth={2.5} />}
      {earned && <g transform="translate(0 3.5)">{shape({ fill: '#C98A00', stroke: '#C98A00', strokeWidth: 1.5 })}</g>}
      {shape({ fill: earned ? `url(#${gradientId})` : BLANK.body, stroke: earned ? '#E0A000' : BLANK.edge, strokeWidth: 1.5 })}
      {earned && <circle cx={32} cy={30} r={20.5} fill="none" stroke="#FFE48A" strokeWidth={1} />}
      <circle cx={32} cy={30} r={15} fill={earned ? '#FFF3C4' : BLANK.face} />
      <g transform="translate(22.4 20.4) scale(0.8)" fill="none" stroke={earned ? '#8A5A00' : BLANK.emblem}
        strokeWidth={size < 48 ? 3.2 : 2.6} strokeLinecap="round" strokeLinejoin="round">
        {emblem}
      </g>
      {plaque && (
        <>
          <rect x={32 - plateWidth / 2} y={52} width={plateWidth} height={15} rx={7.5}
            fill={earned ? '#1E2A44' : BLANK.plate} stroke={earned ? '#1E2A44' : BLANK.edge} strokeWidth={1.5} />
          <text x={32} y={63} textAnchor="middle" fontWeight={800} fontSize={10.5} fill={earned ? '#FFFFFF' : BLANK.plateText}>
            {String(threshold)}
          </text>
        </>
      )}
    </svg>
  );
}
