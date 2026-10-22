import { apiClient } from '../../lib/api-client';
import type { AuditReasonInput } from '../admin-audit/types';
import type { ActivateMission, CreateMission, MissionTemplate, SaveMission } from './types';
const base = '/api/admin/mission-templates';
export const getMissionTemplates = () => apiClient<MissionTemplate[]>(base);
export const getMissionTemplate = (id: number) => apiClient<MissionTemplate>(`${base}/${id}`);
export const createMissionTemplate = (body: CreateMission & AuditReasonInput) => apiClient<MissionTemplate>(base, { method: 'POST', body });
// `reason`: required by the server when the write pushes the daily Coin ceiling past the approved cap (FE-AUD-01).
export const patchTemplate = (id: number, payload: SaveMission & AuditReasonInput) => {
  // Whitelist at transport boundary: never send code, active state or DTO metadata.
  const body: Record<string, unknown> = { version: payload.version };
  const fields = ['name', 'description', 'category', 'triggerEvent', 'targetValue', 'rewardCoin', 'rewardXp', 'rewardItemCode', 'rewardItemFallbackCoin', 'weight', 'eligibilityRule', 'minQuizAccuracyPercent', 'quizRequestedCount', 'reason'] as const;
  for (const key of fields) if (payload[key] !== undefined) body[key] = payload[key];
  return apiClient<MissionTemplate>(`${base}/${id}`, { method: 'PATCH', body });
};
export const setTemplateActive = (id: number, payload: ActivateMission & AuditReasonInput) => apiClient<MissionTemplate>(`${base}/${id}`, { method: 'PATCH', body: { version: payload.version, isActive: payload.isActive, reason: payload.reason } });
