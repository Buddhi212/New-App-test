import { Download, FileSpreadsheet, Menu } from 'lucide-react';
import { sanitizeFileName } from '../utils/sheetLogic';

interface TopBarProps {
  fileName: string;
  rowCount: number;
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  fileName,
  rowCount,
  onDownloadExcel,
  onDownloadCsv,
  onToggleSidebar,
}: TopBarProps) {
  const safeFile = sanitizeFileName(fileName);

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle workbook settings sidebar"
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            SheetLedger
          </span>
          <span className="hidden sm:inline text-slate-300 select-none" aria-hidden="true">
            /
          </span>
          <span className="hidden sm:inline text-sm text-slate-500 truncate max-w-[260px]">
            {safeFile}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onDownloadCsv}
          disabled={rowCount === 0}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          Export CSV
        </button>

        <button
          type="button"
          onClick={onDownloadExcel}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Download Excel (.xlsx)</span>
        </button>
      </div>
    </header>
  );
}
