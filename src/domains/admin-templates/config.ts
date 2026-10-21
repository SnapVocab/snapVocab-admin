// `?.`: import.meta.env is undefined outside Vite (tsx tests).
/**
 * Reads are real (GET /api/schemas, topics, items). Writes have no API yet, so dev/demo builds keep saved edits and the
 * default switch in an in-memory layer over the real data (fixtures.ts). VITE_ADMIN_TEMPLATES_FIXTURES=false shows
 * the read-only screen a release gets.
 */
const flag = import.meta.env?.VITE_ADMIN_TEMPLATES_FIXTURES;
export const templatesUseFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);
// ponytail: edit controls follow the fixture flag; switch to `true` once PUT /api/admin/templates/{id} ships.
export const templatesEditable = templatesUseFixtures;
