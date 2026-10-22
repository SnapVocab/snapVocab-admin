// `?.`: import.meta.env is undefined outside Vite (tsx tests).
// Release remains opt-in until staging acceptance (PD-BDG-13a, badges.md §10).
export const adminBadgesEnabled = import.meta.env?.VITE_ADMIN_BADGES_ENABLED === 'true';

/**
 * The backend ships P2 (PATCH /api/admin/badges/{id}, the refill estimate, migration_badges_v2.sql), so every build
 * reads and writes the real API. VITE_ADMIN_BADGES_FIXTURES=true runs the screen on the in-memory sample catalog,
 * for demos without a backend.
 */
export const badgesUseFixtures = import.meta.env?.VITE_ADMIN_BADGES_FIXTURES === 'true';
export const badgesEditable = true;
