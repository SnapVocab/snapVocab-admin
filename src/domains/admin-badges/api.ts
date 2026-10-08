import { apiClient } from '../../lib/api-client';
import type { AdminBadge } from './types';

const base = '/api/admin/badges';
export const getAdminBadges = () => apiClient<AdminBadge[]>(base);
export const getAdminBadge = (id: number) => apiClient<AdminBadge>(`${base}/${id}`);
