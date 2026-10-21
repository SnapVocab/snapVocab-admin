import type { LucideIcon } from 'lucide-react';
import { Award, BarChart3, BookOpen, Camera, FolderTree, History, Layers, LayoutDashboard, Palette, ShoppingBag, Target, Trophy, Users } from 'lucide-react';
import { adminMissionsEnabled } from '../../domains/admin-missions/config';
import { adminBadgesEnabled } from '../../domains/admin-badges/config';

/**
 * design.md §4 (rev 3):
 * NOW = real API · MOCK = redesigned on labelled sample data · LEGACY = old prototype awaiting redesign.
 */
export type NavScope = 'NOW' | 'MOCK' | 'LEGACY';
/** Operator-facing group names; "LiveOps" stays as the team's own term for missions, shop and badges. */
export type NavSection = 'Tổng quan' | 'Nội dung' | 'LiveOps' | 'Người dùng' | 'Hệ thống';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  section: NavSection;
  Icon: LucideIcon;
  scope: NavScope;
}

/** Dev and demo builds show MOCK and LEGACY screens with labels; a release shows NOW only (design.md §4.2). */
export const showMockScreens = import.meta.env.DEV || import.meta.env.VITE_ADMIN_DEMO === 'true';

const ALL: (NavItem & { enabled?: boolean })[] = [
  { id: 'dashboard', path: '/', label: 'Dashboard', section: 'Tổng quan', Icon: LayoutDashboard, scope: 'MOCK' },
  { id: 'analytics', path: '/analytics', label: 'Phân tích', section: 'Tổng quan', Icon: BarChart3, scope: 'MOCK' },
  { id: 'dictionary', path: '/dictionary', label: 'Từ điển', section: 'Nội dung', Icon: BookOpen, scope: 'NOW' },
  { id: 'topics', path: '/topics', label: 'Chủ đề', section: 'Nội dung', Icon: FolderTree, scope: 'NOW' },
  { id: 'templates', path: '/templates', label: 'Mẫu thẻ', section: 'Nội dung', Icon: Layers, scope: 'NOW' },
  { id: 'ai-scan', path: '/ai-scan', label: 'AI Scan', section: 'Nội dung', Icon: Camera, scope: 'LEGACY' },
  { id: 'missions', path: '/missions', label: 'Nhiệm vụ hằng ngày', section: 'LiveOps', Icon: Target, scope: 'NOW', enabled: adminMissionsEnabled },
  { id: 'shop', path: '/shop', label: 'Cửa hàng & Vật phẩm', section: 'LiveOps', Icon: ShoppingBag, scope: 'NOW' },
  { id: 'badges', path: '/badges', label: 'Huy hiệu', section: 'LiveOps', Icon: Award, scope: 'NOW', enabled: adminBadgesEnabled },
  { id: 'leaderboard', path: '/leaderboard', label: 'Bảng xếp hạng', section: 'LiveOps', Icon: Trophy, scope: 'MOCK' },
  { id: 'learners', path: '/learners', label: 'Người học', section: 'Người dùng', Icon: Users, scope: 'MOCK' },
  { id: 'activity-log', path: '/activity-log', label: 'Nhật ký hoạt động', section: 'Hệ thống', Icon: History, scope: 'MOCK' },
  { id: 'ui-kit', path: '/ui-kit', label: 'UI Kit (dev)', section: 'Hệ thống', Icon: Palette, scope: 'NOW', enabled: import.meta.env.DEV },
];

export const NAV: NavItem[] = ALL.filter((i) => i.enabled !== false && (i.scope === 'NOW' || showMockScreens));
export const SECTIONS: NavSection[] = ['Tổng quan', 'Nội dung', 'LiveOps', 'Người dùng', 'Hệ thống'];

/** "/shop/12" → the Shop item and ["12"]. Unknown paths land on the home item (Dashboard, or the first NOW screen). */
export function matchRoute(pathname: string): { item: NavItem; rest: string[] } {
  const parts = pathname.split('/').filter(Boolean);
  const hit = NAV.find((i) => i.path !== '/' && i.path.slice(1) === parts[0]);
  if (hit) return { item: hit, rest: parts.slice(1) };
  return { item: NAV.find((i) => i.path === '/') ?? NAV[0], rest: [] };
}
