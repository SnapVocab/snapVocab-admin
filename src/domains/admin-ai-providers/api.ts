import { apiClient } from '../../lib/api-client';
import type {
  AiModelOptionDTO,
  AiProviderDTO,
  FetchModelsRequest,
  TestAiProviderResponse,
  UpsertAiProviderRequest,
} from './types';

export function listAiProviders(): Promise<AiProviderDTO[]> {
  return apiClient<AiProviderDTO[]>('/api/admin/ai-providers');
}

export function createAiProvider(body: UpsertAiProviderRequest): Promise<AiProviderDTO> {
  return apiClient<AiProviderDTO>('/api/admin/ai-providers', { method: 'POST', body });
}

export function updateAiProvider(id: number, body: UpsertAiProviderRequest): Promise<AiProviderDTO> {
  return apiClient<AiProviderDTO>(`/api/admin/ai-providers/${id}`, { method: 'PUT', body });
}

export function deleteAiProvider(id: number): Promise<void> {
  return apiClient<void>(`/api/admin/ai-providers/${id}`, { method: 'DELETE' });
}

export function fetchProviderModels(body: FetchModelsRequest): Promise<AiModelOptionDTO[]> {
  return apiClient<AiModelOptionDTO[]>('/api/admin/ai-providers/models', { method: 'POST', body });
}

export function testAiProvider(id: number): Promise<TestAiProviderResponse> {
  return apiClient<TestAiProviderResponse>(`/api/admin/ai-providers/${id}/test`, { method: 'POST' });
}

