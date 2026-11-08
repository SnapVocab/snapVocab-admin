/**
 * The backend ships admin_audit_logs (docs/sa/admin_audit_log_backend.md rev 2), so every build reads the real API.
 * VITE_ADMIN_AUDIT_FIXTURES=true switches to the labelled sample log, for demos without a backend.
 * Own module so editors can link to the log without bundling the fixtures.
 */
// `?.`: import.meta.env is undefined outside Vite (tsx tests).
export const auditUsesFixtures = import.meta.env?.VITE_ADMIN_AUDIT_FIXTURES === 'true';
