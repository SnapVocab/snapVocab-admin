import { apiClient } from '../../lib/api-client';
import type { AdminLearnerDetail, LearnerListParams, LearnerListResponse } from './types';
import { fixtureDetail, fixtureList, fixturePasswordReset, fixtureSetBan } from './fixtures';

/**
 * MOCK scope: the admin users API does not exist yet, so dev/demo builds use labelled fixtures.
 * Set VITE_ADMIN_LEARNERS_FIXTURES=false to call the proposed endpoints (types.ts) once the backend ships.
 */
const flag = import.meta.env.VITE_ADMIN_LEARNERS_FIXTURES;
export const learnersUseFixtures = flag ? flag === 'true' : import.meta.env.DEV;

const base = '/api/admin/users';

export function listLearners(params: LearnerListParams): Promise<LearnerListResponse> {
  if (learnersUseFixtures) return fixtureList(params);
  const query: Record<string, string | number> = { page: params.page ?? 0, size: params.size ?? 20, sort: params.sort ?? 'lastStudied' };
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.activity && params.activity !== 'ALL') query.activity = params.activity;
  return apiClient<LearnerListResponse>(base, { params: query });
}

export const getLearner = (id: number): Promise<AdminLearnerDetail> =>
  learnersUseFixtures ? fixtureDetail(id) : apiClient<AdminLearnerDetail>(`${base}/${id}`);

export const banLearner = (id: number, reason: string): Promise<AdminLearnerDetail> =>
  learnersUseFixtures ? fixtureSetBan(id, true, reason) : apiClient<AdminLearnerDetail>(`${base}/${id}/ban`, { method: 'POST', body: { reason } });

export const unbanLearner = (id: number, reason: string): Promise<AdminLearnerDetail> =>
  learnersUseFixtures ? fixtureSetBan(id, false, reason) : apiClient<AdminLearnerDetail>(`${base}/${id}/unban`, { method: 'POST', body: { reason } });

export const sendPasswordReset = (id: number): Promise<void> =>
  learnersUseFixtures ? fixturePasswordReset(id) : apiClient<void>(`${base}/${id}/password-reset`, { method: 'POST' });
