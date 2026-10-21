import { apiClient } from '../../lib/api-client';
import { templatesUseFixtures } from './config';
import { normalizeSchema } from './mappers';
import type { SchemaDTO, TemplateDTO, TemplateUpdate } from './types';

/** Loaded only when the flag is on (design.md §11). */
const fixtures = () => import('./fixtures');

/** Every schema with groups and templates; ROLE_ADMIN also gets learner forks (SchemaService.getAllSchemas). */
export async function getSchemas(): Promise<SchemaDTO[]> {
  const schemas = (await apiClient<Record<string, unknown>[]>('/api/schemas')).map(normalizeSchema);
  return templatesUseFixtures ? (await fixtures()).applyDrafts(schemas) : schemas;
}

/** Proposed (templates_ui.md §8.2): the whole element list, with the version it was read at. */
export const updateTemplate = (id: number, body: TemplateUpdate): Promise<TemplateDTO | void> =>
  templatesUseFixtures ? fixtures().then((f) => f.fixtureUpdate(id, body)) : apiClient<TemplateDTO>(`/api/admin/templates/${id}`, { method: 'PUT', body });

/** Proposed (§8.3): the schema's default moves to this template in one transaction. */
export const makeDefault = (template: Pick<TemplateDTO, 'id' | 'schemaId' | 'version'>): Promise<TemplateDTO | void> =>
  templatesUseFixtures
    ? fixtures().then((f) => f.fixtureMakeDefault(template.schemaId, template.id))
    : apiClient<TemplateDTO>(`/api/admin/templates/${template.id}/default`, { method: 'POST', body: { version: template.version } });
