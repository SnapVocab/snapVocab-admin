/**
 * MOCK scope: GET /api/admin/leaderboards is specified (docs/sa/leaderboard_backend.md) but not built, so dev/demo
 * builds use labelled fixtures. Set VITE_ADMIN_LEADERBOARD_FIXTURES=false to call the real endpoint once it ships.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
const flag = import.meta.env?.VITE_ADMIN_LEADERBOARD_FIXTURES;
export const leaderboardUsesFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);
