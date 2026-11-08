import { apiClient } from '../../lib/api-client';
import { fixtureOverview } from './fixtures';
import type { AdminOverview } from './types';

/**
 * The backend ships GET /api/admin/overview (docs/sa/admin_overview_backend.md), so every build reads the real API.
 * VITE_ADMIN_OVERVIEW_FIXTURES=true switches to the labelled sample numbers, for demos without a backend.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
export const overviewUsesFixtures = import.meta.env?.VITE_ADMIN_OVERVIEW_FIXTURES === 'true';

export const getOverview = (): Promise<AdminOverview> =>
  overviewUsesFixtures ? fixtureOverview() : apiClient<AdminOverview>('/api/admin/overview');
