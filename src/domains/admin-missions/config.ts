// Backend API exists (AdminMissionTemplateController); release stays opt-in until staging acceptance and PD-DM-06.
export const adminMissionsEnabled = import.meta.env.DEV || import.meta.env.VITE_ADMIN_MISSIONS_ENABLED === 'true';
