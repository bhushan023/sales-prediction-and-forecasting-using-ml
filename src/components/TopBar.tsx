import { Menu, Play, Upload } from 'lucide-react';
import { NAV_ITEMS, type NavSectionId } from './Sidebar.tsx';

interface TopBarProps {
  activeSection: NavSectionId;
  datasetName: string;
  cleanedCount: number;
  hasTrainedModels: boolean;
  isTraining: boolean;
  onOpenMobileMenu: () => void;
  onNavigateUpload: () => void;
  onTrainModels: () => void;
}

export function TopBar({
  activeSection,
  datasetName,
  cleanedCount,
  hasTrainedModels,
  isTraining,
  onOpenMobileMenu,
  onNavigateUpload,
  onTrainModels,
}: TopBarProps) {
  const activeLabel = NAV_ITEMS.find((i) => i.id === activeSection)?.label || 'Home Dashboard';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 whitespace-nowrap">Workspace</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <h1 className="font-semibold text-slate-900 truncate">{activeLabel}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate max-w-[200px] font-medium text-slate-700">{datasetName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{cleanedCount.toLocaleString()} records</span>
          <span aria-hidden="true">·</span>
          <span>{hasTrainedModels ? 'Models ready' : 'Untrained'}</span>
        </div>

        {activeSection === 'upload' ? (
          <button
            type="button"
            onClick={onTrainModels}
            disabled={isTraining || cleanedCount < 12}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isTraining ? 'Training...' : 'Train ML Models'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNavigateUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload CSV</span>
          </button>
        )}
      </div>
    </header>
  );
}
