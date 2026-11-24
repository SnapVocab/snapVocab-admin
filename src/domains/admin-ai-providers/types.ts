export type AiProviderType = 'GEMINI' | 'OPENAI_COMPATIBLE';

export interface AiProviderDTO {
  id: number;
  name: string;
  providerType: AiProviderType;
  baseUrl: string;
  maskedApiKey: string;
  hasApiKey: boolean;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  enabled: boolean;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertAiProviderRequest {
  name: string;
  providerType: AiProviderType;
  baseUrl: string;
  apiKey?: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  enabled?: boolean;
  priority?: number;
}

export interface FetchModelsRequest {
  providerId?: number;
  providerType?: AiProviderType;
  baseUrl?: string;
  apiKey?: string;
}

export interface AiModelOptionDTO {
  id: string;
  displayName: string;
}

export interface TestAiProviderResponse {
  ok: boolean;
  latencyMs: number;
  sampleOutput?: string;
  error?: string;
}

