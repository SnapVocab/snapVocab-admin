/**
 * The backend ships GET /api/admin/leaderboards (docs/sa/leaderboard_backend.md §7), so every build reads the real
 * API. VITE_ADMIN_LEADERBOARD_FIXTURES=true runs the screen on the labelled sample board instead (demos, no backend).
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
export const leaderboardUsesFixtures = import.meta.env?.VITE_ADMIN_LEADERBOARD_FIXTURES === 'true';
