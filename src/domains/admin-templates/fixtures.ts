import type { SchemaDTO, TemplateDTO, TemplateUpdate } from './types';

/**
 * MOCK writes over real reads (config.ts): saved templates and default switches live here until the page reloads.
 * Loaded with import() behind the flag, so a release build never ships it.
 */
const saved = new Map<number, Pick<TemplateDTO, 'name' | 'elements' | 'updatedAt'>>();
const defaults = new Map<number, number>();
let nextId = -1;

export function applyDrafts(schemas: SchemaDTO[]): SchemaDTO[] {
  return schemas.map((s) => ({
    ...s,
    templates: s.templates.map((t) => ({ ...t, ...saved.get(t.id), isDefault: defaults.has(s.id) ? defaults.get(s.id) === t.id : t.isDefault })),
  }));
}

/** New elements get negative ids, like rows the server has not numbered. */
export function fixtureUpdate(id: number, body: TemplateUpdate): void {
  const elements = body.elements.map((e) => ({ ...e, id: e.id ?? nextId--, field: e.field && { ...e.field, id: e.field.id ?? nextId-- } }));
  saved.set(id, { name: body.name, elements, updatedAt: new Date().toISOString() });
}

export function fixtureMakeDefault(schemaId: number, id: number): void {
  defaults.set(schemaId, id);
}
