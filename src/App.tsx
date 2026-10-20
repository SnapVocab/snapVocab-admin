import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { AdminLayout } from './components/layout/AdminLayout';
import { Loader2, History } from 'lucide-react';
import { AuthProvider } from './domains/auth/use-auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { matchRoute } from './components/layout/nav';
import { navigate, setLeaveGuard, usePathname } from './lib/router';

// Code-split all feature pages with React.lazy
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const DictionaryPage = lazy(() => import('./features/admin-dictionary/DictionaryPage').then((m) => ({ default: m.DictionaryPage })));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const TopicsPage = lazy(() => import('./features/admin-topics/TopicsPage').then((m) => ({ default: m.TopicsPage })));
const TemplatesPage = lazy(() => import('./features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const AIScanMonitorPage = lazy(() => import('./features/ai-scan/AIScanMonitorPage').then((m) => ({ default: m.AIScanMonitorPage })));
const ShopEconomyPage = lazy(() => import('./features/shop/ShopEconomyPage').then((m) => ({ default: m.ShopEconomyPage })));
const AdminMissionsPage = lazy(() => import('./features/admin-missions/AdminMissionsPage').then((m) => ({ default: m.AdminMissionsPage })));
// Opt-in P1: the inline flag lets production builds omit the module until staging acceptance.
const AdminBadgesPage = import.meta.env.VITE_ADMIN_BADGES_ENABLED === 'true'
  ? lazy(() => import('./features/admin-badges/AdminBadgesPage').then((m) => ({ default: m.AdminBadgesPage })))
  : null;
const LearnersPage = lazy(() => import('./features/admin-learners/LearnersPage').then((m) => ({ default: m.LearnersPage })));
const AuditActivityLogPage = lazy(() => import('./features/audit/AuditActivityLogPage').then((m) => ({ default: m.AuditActivityLogPage })));
// Dev-only reference page for src/components/ui; `DEV` is false in production, so the chunk is never emitted.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('./features/ui-kit/UiKitPage')) : null;

const LEAVE_MESSAGE = 'Trang hiện tại có thay đổi chưa lưu hoặc thao tác đang xử lý. Rời trang sẽ mất nội dung đang nhập. Tiếp tục?';

/** Old prototype screens still link by their old nav ids; map them onto today's routes. */
const LEGACY_LINKS: Record<string, string> = {
  dashboard: '/', analytics: '/analytics', 'content-studio': '/dictionary', topics: '/topics', templates: '/templates',
  'ai-queue': '/ai-scan', 'ai-monitor': '/ai-scan', shop: '/shop', missions: '/missions', badges: '/badges',
  learners: '/learners', 'activity-log': '/activity-log',
};

function PageLoadingFallback() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-text-muted select-none" role="status" aria-label="Đang tải màn hình">
      <Loader2 size={28} className="animate-spin text-primary mb-3 motion-reduce:animate-none" />
      <span className="text-xs font-semibold">Đang tải…</span>
    </div>
  );
}

/** Old prototype screens stay reachable in dev/demo, but say plainly what they are. */
function LegacyScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <p role="note" className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-light px-3 py-2 text-xs text-warning-dark sm:mx-6">
        <History size={14} className="shrink-0" />
        Bản mock cũ, chưa thiết kế lại theo đặc tả rev 3: số liệu là dữ liệu mẫu và còn khái niệm ngoài scope (docs/reviews/admin_product_review_2026-10-19.md).
      </p>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function AdminWorkspace() {
  const pathname = usePathname();
  const { item, rest } = matchRoute(pathname);
  // Set by pages with editors (Missions, Shop): unsaved edits or a write in flight.
  const [pageDirty, setPageDirty] = useState(false);
  const dirtyRef = useRef(pageDirty);
  useEffect(() => {
    dirtyRef.current = pageDirty;
  }, [pageDirty]);
  // Browser back/forward asks too.
  useEffect(() => {
    setLeaveGuard(() => !dirtyRef.current || window.confirm(LEAVE_MESSAGE));
    return () => setLeaveGuard(null);
  }, []);

  const go = (path: string) => {
    if (path === pathname) return;
    if (pageDirty && !window.confirm(LEAVE_MESSAGE)) return;
    setPageDirty(false);
    navigate(path);
  };
  const legacy = { onNavigate: (id: string) => go(LEGACY_LINKS[id] ?? '/'), onWordChange: () => {} };

  const renderCurrentView = () => {
    switch (item.id) {
      case 'missions': return <AdminMissionsPage onDirtyChange={setPageDirty} sub={rest[0]} />;
      case 'shop': return <ShopEconomyPage onDirtyChange={setPageDirty} sub={rest[0]} />;
      case 'badges': return AdminBadgesPage ? <AdminBadgesPage /> : null;
      case 'learners': return <LearnersPage sub={rest[0]} />;
      case 'ui-kit': return UiKitPage ? <UiKitPage /> : null;
      case 'analytics': return <AnalyticsPage sub={rest[0]} />;
      case 'dictionary': return <DictionaryPage rest={rest} />;
      case 'topics': return <TopicsPage rest={rest} />;
      case 'templates': return <LegacyScreen><TemplatesPage {...legacy} /></LegacyScreen>;
      case 'ai-scan': return <LegacyScreen><AIScanMonitorPage activeNav="ai-monitor" {...legacy} /></LegacyScreen>;
      case 'activity-log': return <LegacyScreen><AuditActivityLogPage {...legacy} /></LegacyScreen>;
      default: return <DashboardPage />;
    }
  };

  return (
    <AdminLayout activePath={item.path} onNavigate={go}>
      <Suspense fallback={<PageLoadingFallback />}>{renderCurrentView()}</Suspense>
    </AdminLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminWorkspace />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
