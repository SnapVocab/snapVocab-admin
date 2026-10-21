/**
 * MOCK scope: admin_audit_logs does not exist yet, so dev/demo builds use labelled fixtures.
 * Set VITE_ADMIN_AUDIT_FIXTURES=false to call the proposed endpoints (types.ts) once the backend ships.
 * Own module so editors can link to the log without bundling the fixtures.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
const flag = import.meta.env?.VITE_ADMIN_AUDIT_FIXTURES;
export const auditUsesFixtures = flag ? flag === 'true' : Boolean(import.meta.env?.DEV);
