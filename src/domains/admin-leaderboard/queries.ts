import { useQuery } from '@tanstack/react-query';
import { getAdminLeaderboard } from './api';
import type { LeaderboardWeek } from './types';

export const leaderboardKeys = { board: (week: LeaderboardWeek) => ['adminLeaderboard', week] as const };

/** The backend recomputes the snapshot once a minute (leaderboard_backend.md §5.6); asking sooner returns the same asOf. */
export const useAdminLeaderboard = (week: LeaderboardWeek) =>
  useQuery({ queryKey: leaderboardKeys.board(week), queryFn: () => getAdminLeaderboard(week), staleTime: 60_000 });
