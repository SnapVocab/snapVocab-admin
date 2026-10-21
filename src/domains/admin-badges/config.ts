// `?.`: import.meta.env is undefined outside Vite (tsx tests).
// P1 uses real GET APIs. Release remains opt-in until staging acceptance (PD-BDG-13a, badges.md §10).
export const adminBadgesEnabled = import.meta.env?.VITE_ADMIN_BADGES_ENABLED === 'true';

/**
 * MOCK P2 (design.md §4.1): PATCH and the refill estimate are not built, so dev/demo builds run the whole screen on an
 * in-memory catalog where editing and Bật/Tắt work. Set VITE_ADMIN_BADGES_FIXTURES=false to see the real P1 API,
 * which is read-only.
 */
const flag = import.meta.env?.VITE_ADMIN_BADGES_FIXTURES;
export const badgesUseFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);
// ponytail: P2 controls follow the fixture flag; switch to `true` once PATCH /api/admin/badges/{id} ships.
export const badgesEditable = badgesUseFixtures;
