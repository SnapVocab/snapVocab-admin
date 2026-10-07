import { useQuery } from '@tanstack/react-query';
import { getMissionTemplate, getMissionTemplates } from './api';
export const missionKeys = { all: ['adminMissions'] as const, list: ['adminMissions', 'list'] as const, detail: (id: number) => ['adminMissions', 'detail', id] as const };
export function useMissionTemplates() { return useQuery({ queryKey: missionKeys.list, queryFn: getMissionTemplates, retry: false }); }
export function useMissionTemplate(id?: number) { return useQuery({ queryKey: missionKeys.detail(id ?? 0), queryFn: () => getMissionTemplate(id!), enabled: id !== undefined, retry: false }); }
