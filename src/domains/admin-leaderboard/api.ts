import { apiClient } from '../../lib/api-client';
import { leaderboardUsesFixtures } from './config';
import type { AdminLeaderboard, LeaderboardWeek } from './types';

export { leaderboardUsesFixtures };

/** Fixtures load only when the flag is on, so the screen ships without sample data once the endpoint exists. */
export const getAdminLeaderboard = (week: LeaderboardWeek): Promise<AdminLeaderboard> =>
  leaderboardUsesFixtures
    ? import('./fixtures').then((f) => f.fixtureLeaderboard(week))
    : apiClient<AdminLeaderboard>('/api/admin/leaderboards', { params: { week } });
