// `?.`: import.meta.env is undefined outside Vite (tsx tests).
/**
 * Reads and writes are real: GET /api/schemas, PUT /api/admin/templates/{id}, POST /api/admin/templates/{id}/default
 * (backend admin content v1). VITE_ADMIN_TEMPLATES_FIXTURES=true puts back the in-memory overlay (fixtures.ts) for demos
 * against a backend without those endpoints; saved edits then vanish on reload and every screen says so.
 */
export const templatesUseFixtures = import.meta.env?.VITE_ADMIN_TEMPLATES_FIXTURES === 'true';
export const templatesEditable = true;
