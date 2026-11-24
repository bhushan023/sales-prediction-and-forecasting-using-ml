import {
  Award,
  BarChart3,
  BookOpen,
  Cpu,
  LayoutDashboard,
  LineChart,
  PieChart,
  Target,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type NavSectionId =
  | 'home'
  | 'upload'
  | 'eda'
  | 'visualization'
  | 'training'
  | 'prediction'
  | 'forecasting'
  | 'evaluation'
  | 'documentation';

export interface NavItem {
  id: NavSectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload Sales Dataset', icon: Upload },
  { id: 'eda', label: 'Data Analysis', icon: PieChart },
  { id: 'visualization', label: 'Sales Visualization', icon: BarChart3 },
  { id: 'training', label: 'ML Model Training', icon: Cpu },
  { id: 'prediction', label: 'Sales Prediction', icon: Target },
  { id: 'forecasting', label: 'Future Forecasting', icon: TrendingUp },
  { id: 'evaluation', label: 'Model Performance', icon: Award },
  { id: 'documentation', label: 'Project Information', icon: BookOpen },
];

interface SidebarProps {
  activeSection: NavSectionId;
  onSelect: (id: NavSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  hasTrainedModels: boolean;
}

export function Sidebar({
  activeSection,
  onSelect,
  mobileOpen,
  onCloseMobile,
  hasTrainedModels,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            onSelect('home');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white shrink-0">
            <LineChart className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SalesForecast ML
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const requiresModels =
            item.id === 'prediction' || item.id === 'forecasting' || item.id === 'evaluation';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {requiresModels && !hasTrainedModels && (
                <span className="text-[11px] font-normal text-slate-400 shrink-0">
                  Train
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Sales Prediction &amp; Forecasting</p>
        <p className="mt-0.5 text-slate-500">Regression &amp; Time-Series Analytics</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:fixed lg:inset-y-0 lg:left-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{navContent}</aside>
        </div>
      )}
    </>
  );
}
