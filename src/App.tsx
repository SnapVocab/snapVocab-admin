import { useState, lazy, Suspense } from 'react';
import { AdminLayout } from './components/layout/AdminLayout';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './domains/auth/use-auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { adminMissionsEnabled } from './domains/admin-missions/config';

// Code-split all feature pages with React.lazy
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ContentStudioPage = lazy(() =>
  import('./features/content-studio/ContentStudioPage').then((m) => ({ default: m.ContentStudioPage }))
);
const AnalyticsPage = lazy(() =>
  import('./features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const TopicsDecksPage = lazy(() =>
  import('./features/topics/TopicsDecksPage').then((m) => ({ default: m.TopicsDecksPage }))
);
const TemplatesPage = lazy(() =>
  import('./features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage }))
);
const AIScanMonitorPage = lazy(() =>
  import('./features/ai-scan/AIScanMonitorPage').then((m) => ({ default: m.AIScanMonitorPage }))
);
const ShopEconomyPage = lazy(() =>
  import('./features/shop/ShopEconomyPage').then((m) => ({ default: m.ShopEconomyPage }))
);
const AdminMissionsPage = lazy(() =>
  import('./features/admin-missions/AdminMissionsPage').then(m => ({ default: m.AdminMissionsPage }))
);
const BadgesPage = lazy(() =>
  import('./features/badges/BadgesPage').then((m) => ({ default: m.BadgesPage }))
);
const LeaderboardSeasonsPage = lazy(() =>
  import('./features/seasons/LeaderboardSeasonsPage').then((m) => ({
    default: m.LeaderboardSeasonsPage,
  }))
);
const LearnersPage = lazy(() =>
  import('./features/people/LearnersPage').then((m) => ({ default: m.LearnersPage }))
);
const IssueReportsPage = lazy(() =>
  import('./features/reports/IssueReportsPage').then((m) => ({ default: m.IssueReportsPage }))
);
const AuditActivityLogPage = lazy(() =>
  import('./features/audit/AuditActivityLogPage').then((m) => ({
    default: m.AuditActivityLogPage,
  }))
);
// Dev-only reference page for src/components/ui; `DEV` is false in production, so the chunk is never emitted.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('./features/ui-kit/UiKitPage')) : null;
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

function PageLoadingFallback() {
  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-text-muted select-none"
      role="status"
      aria-label="Đang tải dữ liệu màn hình tác nghiệp"
    >
      <Loader2 size={28} className="animate-spin text-primary mb-3 motion-reduce:animate-none" />
      <span className="text-xs font-semibold">Đang tải phân hệ...</span>
    </div>
  );
}

function AdminWorkspace() {
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  // Set by pages with editors (Missions, Shop): unsaved edits or a write in flight.
  const [pageDirty, setPageDirty] = useState(false);
  const navigate = (nav: string) => {
    if (nav === activeNav) return;
    if (pageDirty && !window.confirm('Trang hiện tại có thay đổi chưa lưu hoặc thao tác đang xử lý. Rời trang sẽ mất nội dung đang nhập. Tiếp tục?')) return;
    setPageDirty(false);
    setActiveNav(nav);
  };
  const [currentWordTitle, setCurrentWordTitle] = useState<string>('apple');

  const renderCurrentView = () => {
    switch (activeNav) {
      case 'missions':
        return adminMissionsEnabled ? <AdminMissionsPage onDirtyChange={setPageDirty} /> : <DashboardPage onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveNav} />;

      case 'analytics':
        return (
          <AnalyticsPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'content-studio':
        return <ContentStudioPage onWordChange={setCurrentWordTitle} />;

      case 'topics':
        return (
          <TopicsDecksPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'templates':
        return (
          <TemplatesPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'ai-queue':
      case 'ai-monitor':
        return (
          <AIScanMonitorPage
            activeNav={activeNav}
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'shop':
        return (
          <ShopEconomyPage
            onDirtyChange={setPageDirty}
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'badges':
        return (
          <BadgesPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'seasons':
        return (
          <LeaderboardSeasonsPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'learners':
        return (
          <LearnersPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'reports':
        return (
          <IssueReportsPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'activity-log':
        return (
          <AuditActivityLogPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            onNavigate={setActiveNav}
            onWordChange={setCurrentWordTitle}
          />
        );

      case 'ui-kit':
        if (UiKitPage) return <UiKitPage />;
        return <DashboardPage onNavigate={setActiveNav} />;

      default:
        return <DashboardPage onNavigate={setActiveNav} />;
    }
  };

  return (
    <AdminLayout
      currentWordTitle={currentWordTitle}
      activeNav={activeNav}
      onNavigate={navigate}
    >
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

