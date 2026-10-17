import { apiClient } from '../../lib/api-client';
import type { ActivateMission, CreateMission, MissionTemplate, SaveMission } from './types';
const base = '/api/admin/mission-templates';
export const getMissionTemplates = () => apiClient<MissionTemplate[]>(base);
export const getMissionTemplate = (id: number) => apiClient<MissionTemplate>(`${base}/${id}`);
export const createMissionTemplate = (body: CreateMission) => apiClient<MissionTemplate>(base, { method: 'POST', body });
export const patchTemplate = (id: number, payload: SaveMission) => {
  // Whitelist at transport boundary: never send code, active state or DTO metadata.
  const body: Record<string, unknown> = { version: payload.version };
  const fields = ['name', 'description', 'category', 'triggerEvent', 'targetValue', 'rewardCoin', 'rewardXp', 'rewardItemCode', 'rewardItemFallbackCoin', 'weight', 'eligibilityRule', 'minQuizAccuracyPercent', 'quizRequestedCount'] as const;
  for (const key of fields) if (payload[key] !== undefined) body[key] = payload[key];
  return apiClient<MissionTemplate>(`${base}/${id}`, { method: 'PATCH', body });
};
export const setTemplateActive = (id: number, payload: ActivateMission) => apiClient<MissionTemplate>(`${base}/${id}`, { method: 'PATCH', body: { version: payload.version, isActive: payload.isActive } });
