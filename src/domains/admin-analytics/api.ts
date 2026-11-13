import { apiClient } from '../../lib/api-client';
import { fixtureAnalytics } from './fixtures';
import type { AdminAnalytics, AnalyticsDays } from './types';

/**
 * The backend ships GET /api/admin/analytics (docs/sa/admin_analytics_backend.md), so every build reads the real API.
 * VITE_ADMIN_ANALYTICS_FIXTURES=true switches to the labelled sample numbers, for demos without a backend.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
export const analyticsUsesFixtures = import.meta.env?.VITE_ADMIN_ANALYTICS_FIXTURES === 'true';

export const getAnalytics = (days: AnalyticsDays): Promise<AdminAnalytics> =>
  analyticsUsesFixtures ? fixtureAnalytics(days) : apiClient<AdminAnalytics>('/api/admin/analytics', { params: { days } });
