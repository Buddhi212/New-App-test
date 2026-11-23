import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Palette, Smartphone, WifiOff } from 'lucide-react';
import { DataGrid } from './components/DataGrid';
import { EntryForm } from './components/EntryForm';
import { InstallAppModal } from './components/InstallAppModal';
import { SidebarConfig } from './components/SidebarConfig';
import { TopBar } from './components/TopBar';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  isDarkBackground,
  normalizeHexColor,
} from './utils/backgroundPresets';
import {
  SHEET_TEMPLATES,
  createEmptyDraft,
  exportCsvString,
  exportWorkbookToBytes,
  filterRows,
  sanitizeFileName,
  sanitizeSheetName,
  sortRows,
  validateRowInput,
  type ColumnDef,
  type ColumnType,
  type RowData,
  type SortConfig,
} from './utils/sheetLogic';

const STORAGE_KEY = 'sheetledger_workspace_v1';
const BG_STORAGE_KEY = 'sheetledger_bg_v1';

function loadInitialBackground(): string {
  try {
    const saved = localStorage.getItem(BG_STORAGE_KEY);
    if (saved) return normalizeHexColor(saved);
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_BACKGROUND_COLOR;
}

interface PersistedState {
  activeTemplateId: string;
  fileName: string;
  sheetName: string;
  columns: ColumnDef[];
  rows: RowData[];
}

function loadInitialState(): PersistedState {
  const defaultTpl = SHEET_TEMPLATES[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.columns) && parsed.columns.length > 0 && Array.isArray(parsed.rows)) {
        return {
          activeTemplateId: parsed.activeTemplateId ?? defaultTpl.id,
          fileName: parsed.fileName ?? defaultTpl.fileName,
          sheetName: parsed.sheetName ?? defaultTpl.sheetName,
          columns: parsed.columns,
          rows: parsed.rows,
        };
      }
    }
  } catch {
    // Ignore storage read errors and fall back to default template
  }

  return {
    activeTemplateId: defaultTpl.id,
    fileName: defaultTpl.fileName,
    sheetName: defaultTpl.sheetName,
    columns: defaultTpl.columns,
    rows: defaultTpl.rows,
  };
}

function triggerBlobDownload(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [activeTemplateId, setActiveTemplateId] = useState<string>(initial.activeTemplateId);
  const [fileName, setFileName] = useState<string>(initial.fileName);
  const [sheetName, setSheetName] = useState<string>(initial.sheetName);
  const [columns, setColumns] = useState<ColumnDef[]>(initial.columns);
  const [rows, setRows] = useState<RowData[]>(initial.rows);

  const [draft, setDraft] = useState<Record<string, string>>(() => createEmptyDraft(initial.columns));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>(() => loadInitialBackground());
  const [isBgPopoverOpen, setIsBgPopoverOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const bgPopoverRef = useRef<HTMLDivElement | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    try {
      const payload: PersistedState = {
        activeTemplateId,
        fileName,
        sheetName,
        columns,
        rows,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [activeTemplateId, fileName, sheetName, columns, rows]);

  useEffect(() => {
    if (!exportNotice) return;
    const timer = setTimeout(() => setExportNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [exportNotice]);

  useEffect(() => {
    try {
      localStorage.setItem(BG_STORAGE_KEY, backgroundColor);
    } catch {
      // Ignore quota errors
    }
    document.documentElement.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  useEffect(() => {
    if (!isBgPopoverOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (bgPopoverRef.current && !bgPopoverRef.current.contains(e.target as Node)) {
        setIsBgPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isBgPopoverOpen]);

  const handleChangeBackgroundColor = (color: string) => {
    setBackgroundColor(normalizeHexColor(color));
  };

  const handlePhoneAppClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setIsInstallModalOpen(true);
  };

  const darkBg = isDarkBackground(backgroundColor);

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, columns, searchQuery);
    return sortRows(filtered, columns, sort);
  }, [rows, columns, searchQuery, sort]);

  const handleSelectTemplate = (templateId: string) => {
    const tpl = SHEET_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplateId(tpl.id);
    setFileName(tpl.fileName);
    setSheetName(tpl.sheetName);
    setColumns(tpl.columns);
    setRows(tpl.rows);
    setDraft(createEmptyDraft(tpl.columns));
    setErrors({});
    setSearchQuery('');
    setSort(null);
  };

  const handleAddColumn = (label: string, type: ColumnType, optionsCsv: string) => {
    const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const options =
      type === 'select'
        ? optionsCsv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newCol: ColumnDef = {
      id,
      label,
      type,
      options: options && options.length > 0 ? options : undefined,
    };

    setColumns((prev) => [...prev, newCol]);
    setDraft((prev) => ({
      ...prev,
      [id]: newCol.type === 'select' && newCol.options ? newCol.options[0] : '',
    }));
  };

  const handleRemoveColumn = (colId: string) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setDraft((prev) => {
      const next = { ...prev };
      delete next[colId];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[colId];
      return next;
    });
    if (sort?.columnId === colId) {
      setSort(null);
    }
  };

  const handleChangeDraftField = (colId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [colId]: value }));
    if (errors[colId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[colId];
        return next;
      });
    }
  };

  const handleAddRow = (): boolean => {
    const validationErrors = validateRowInput(columns, draft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const newRow: RowData = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      values: { ...draft },
    };

    setRows((prev) => [...prev, newRow]);
    setDraft(createEmptyDraft(columns));
    setErrors({});
    return true;
  };

  const handleUpdateCell = (rowId: string, colId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, values: { ...row.values, [colId]: value } } : row
      )
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleClearAllRows = () => {
    setRows([]);
    setSearchQuery('');
  };

  const handleLoadSampleRows = () => {
    const tpl =
      SHEET_TEMPLATES.find((t) => t.id === activeTemplateId && t.rows.length > 0) ??
      SHEET_TEMPLATES[0];

    if (tpl.id !== activeTemplateId && activeTemplateId === 'blank') {
      handleSelectTemplate(tpl.id);
      return;
    }

    setRows(tpl.rows.map((r, i) => ({ ...r, id: `row_sample_${Date.now()}_${i}` })));
  };

  const handleToggleSort = (colId: string) => {
    setSort((prev) => {
      if (!prev || prev.columnId !== colId) {
        return { columnId: colId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnId: colId, direction: 'desc' };
      }
      return null;
    });
  };

  const handleDownloadExcel = () => {
    const safeFile = sanitizeFileName(fileName);
    const safeSheet = sanitizeSheetName(sheetName);
    const bytes = exportWorkbookToBytes(columns, visibleRows, safeSheet);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, safeFile);
    setExportNotice(
      `Downloaded ${safeFile} (${visibleRows.length} ${
        visibleRows.length === 1 ? 'row' : 'rows'
      } on "${safeSheet}")`
    );
  };

  const handleDownloadCsv = () => {
    const baseName = sanitizeFileName(fileName).replace(/\.xlsx$/i, '.csv');
    const csv = exportCsvString(columns, visibleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, baseName);
    setExportNotice(`Downloaded ${baseName} (${visibleRows.length} rows)`);
  };

  return (
    <div
      className="min-h-screen flex flex-col text-slate-900 transition-colors duration-150"
      style={{ backgroundColor }}
      data-bg-color={backgroundColor}
    >
      <TopBar
        fileName={fileName}
        rowCount={visibleRows.length}
        onDownloadExcel={handleDownloadExcel}
        onDownloadCsv={handleDownloadCsv}
        onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)}
      />

      <div className="flex-1 flex min-h-0">
        <SidebarConfig
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          activeTemplateId={activeTemplateId}
          onSelectTemplate={handleSelectTemplate}
          fileName={fileName}
          onChangeFileName={setFileName}
          sheetName={sheetName}
          onChangeSheetName={setSheetName}
          columns={columns}
          onAddColumn={handleAddColumn}
          onRemoveColumn={handleRemoveColumn}
          backgroundColor={backgroundColor}
          onChangeBackgroundColor={handleChangeBackgroundColor}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1440px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  darkBg ? 'text-white' : 'text-slate-900'
                }`}
              >
                Data Entry &amp; Excel Export
              </h1>
              <p className={`mt-1 text-sm ${darkBg ? 'text-slate-300' : 'text-slate-600'}`}>
                Add rows below, edit any cell directly in the grid, or customize columns before exporting to Excel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {exportNotice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>{exportNotice}</span>
                </div>
              )}

              <div className="relative" ref={bgPopoverRef}>
                <button
                  type="button"
                  onClick={() => setIsBgPopoverOpen((v) => !v)}
                  aria-expanded={isBgPopoverOpen}
                  aria-haspopup="true"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Background</span>
                  <span
                    className="w-3 h-3 rounded-sm border border-slate-300 shrink-0"
                    style={{ backgroundColor }}
                    aria-hidden="true"
                  />
                </button>

                {isBgPopoverOpen && (
                  <div
                    role="region"
                    aria-label="Choose workspace background"
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 p-3.5 shadow-lg z-30"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-slate-900">
                        Workspace Background
                      </span>
                      {backgroundColor !== DEFAULT_BACKGROUND_COLOR && (
                        <button
                          type="button"
                          onClick={() => handleChangeBackgroundColor(DEFAULT_BACKGROUND_COLOR)}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {BACKGROUND_PRESETS.map((preset) => {
                        const isSelected =
                          backgroundColor.toLowerCase() === preset.color.toLowerCase();
                        const presetDark = preset.color === '#0f172a';
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleChangeBackgroundColor(preset.color)}
                            aria-pressed={isSelected}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-300 shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: preset.color }}
                              aria-hidden="true"
                            >
                              {isSelected && (
                                <Check
                                  className={`w-2.5 h-2.5 ${
                                    presetDark ? 'text-white' : 'text-emerald-700'
                                  }`}
                                />
                              )}
                            </span>
                            <span className="truncate">{preset.name.split(' ')[1] ?? preset.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                      <label htmlFor="quick-custom-bg" className="text-xs text-slate-600">
                        Custom color
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 uppercase">
                          {backgroundColor}
                        </span>
                        <input
                          id="quick-custom-bg"
                          type="color"
                          aria-label="Pick custom background color"
                          value={backgroundColor}
                          onChange={(e) => handleChangeBackgroundColor(e.target.value)}
                          className="w-8 h-7 p-0.5 rounded border border-slate-300 bg-white cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={handlePhoneAppClick}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>{isInstallable ? 'Install App' : 'Get Phone App'}</span>
                </button>
              )}
            </div>
          </div>

          <EntryForm
            columns={columns}
            draft={draft}
            errors={errors}
            onChangeField={handleChangeDraftField}
            onSubmit={handleAddRow}
          />

          <DataGrid
            columns={columns}
            rows={visibleRows}
            totalRowCount={rows.length}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            sort={sort}
            onToggleSort={handleToggleSort}
            onUpdateCell={handleUpdateCell}
            onDeleteRow={handleDeleteRow}
            onClearAllRows={handleClearAllRows}
            onLoadSampleRows={handleLoadSampleRows}
          />
        </main>
      </div>

      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-950 bg-amber-100 border border-amber-300 rounded-lg shadow-sm"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-800 shrink-0" aria-hidden="true" />
          <span>Offline mode — changes saved locally</span>
        </div>
      )}

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onTriggerNativeInstall={install}
      />
    </div>
  );
}
