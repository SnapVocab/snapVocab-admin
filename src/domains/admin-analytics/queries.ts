import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAnalytics } from './api';
import type { AnalyticsDays } from './types';

export const analyticsKeys = { byDays: (days: AnalyticsDays) => ['adminAnalytics', days] as const };

/** keepPreviousData: switching the period keeps the old numbers on screen instead of flashing skeletons. */
export const useAnalytics = (days: AnalyticsDays) =>
  useQuery({ queryKey: analyticsKeys.byDays(days), queryFn: () => getAnalytics(days), retry: false, placeholderData: keepPreviousData });
