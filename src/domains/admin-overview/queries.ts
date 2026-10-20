import { useQuery } from '@tanstack/react-query';
import { getOverview } from './api';

export const overviewKeys = { all: ['adminOverview'] as const };

export const useOverview = () => useQuery({ queryKey: overviewKeys.all, queryFn: getOverview, retry: false });
