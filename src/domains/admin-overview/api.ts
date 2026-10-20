import { apiClient } from '../../lib/api-client';
import { fixtureOverview } from './fixtures';
import type { AdminOverview } from './types';

/**
 * MOCK scope: the overview API does not exist yet, so dev/demo builds use labelled fixtures.
 * Set VITE_ADMIN_OVERVIEW_FIXTURES=false to call the proposed endpoint (types.ts) once the backend ships.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
const flag = import.meta.env?.VITE_ADMIN_OVERVIEW_FIXTURES;
export const overviewUsesFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);

export const getOverview = (): Promise<AdminOverview> =>
  overviewUsesFixtures ? fixtureOverview() : apiClient<AdminOverview>('/api/admin/overview');
