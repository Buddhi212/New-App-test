import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DataGrid } from './components/DataGrid';
import { EntryForm } from './components/EntryForm';
import { SidebarConfig } from './components/SidebarConfig';
import { TopBar } from './components/TopBar';
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1440px]">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Data Entry &amp; Excel Export
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Add rows below, edit any cell directly in the grid, or customize columns before exporting to Excel.
              </p>
            </div>

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
    </div>
  );
}
