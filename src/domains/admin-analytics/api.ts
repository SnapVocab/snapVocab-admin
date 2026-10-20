import { apiClient } from '../../lib/api-client';
import { fixtureAnalytics } from './fixtures';
import type { AdminAnalytics, AnalyticsDays } from './types';

/**
 * MOCK scope: the analytics API does not exist yet, so dev/demo builds use labelled fixtures.
 * Set VITE_ADMIN_ANALYTICS_FIXTURES=false to call the proposed endpoint (types.ts) once the backend ships.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
const flag = import.meta.env?.VITE_ADMIN_ANALYTICS_FIXTURES;
export const analyticsUsesFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);

export const getAnalytics = (days: AnalyticsDays): Promise<AdminAnalytics> =>
  analyticsUsesFixtures ? fixtureAnalytics(days) : apiClient<AdminAnalytics>('/api/admin/analytics', { params: { days } });
