// P1 uses real GET APIs. Release remains opt-in until staging acceptance (PD-BDG-13a, badges.md §10).
export const adminBadgesEnabled = import.meta.env.VITE_ADMIN_BADGES_ENABLED === 'true';
