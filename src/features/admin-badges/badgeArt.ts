// ponytail: copied from SnapVocab/src/assets/images/badges (one file per catalog code); share once a package exists.
// import.meta.glob exists only under Vite; plain Node (tsx tests) gets no art and the drawn medal instead.
// Vite rewrites the call itself at build time, so `import.meta.glob` cannot be feature-tested; Node throws instead.
let files: Record<string, string> = {};
try {
  files = import.meta.glob<string>('../../assets/badges/*.png', { eager: true, import: 'default' });
}
catch { /* no Vite: keep the drawn medals */ }

/** File `streak_7.png` → code `STREAK_7`. */
const ART: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.png', '').toUpperCase(), url]),
);

/** Illustrated art the app shows for this catalog code, if any. */
export function badgeArt(code: string): string | undefined {
  return ART[code];
}
