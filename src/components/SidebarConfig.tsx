import { useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  SHEET_TEMPLATES,
  sanitizeFileName,
  sanitizeSheetName,
  type ColumnDef,
  type ColumnType,
} from '../utils/sheetLogic';

interface SidebarConfigProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  fileName: string;
  onChangeFileName: (name: string) => void;
  sheetName: string;
  onChangeSheetName: (name: string) => void;
  columns: ColumnDef[];
  onAddColumn: (label: string, type: ColumnType, optionsCsv: string) => void;
  onRemoveColumn: (colId: string) => void;
}

const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'List',
};

export function SidebarConfig({
  isOpenMobile,
  onCloseMobile,
  activeTemplateId,
  onSelectTemplate,
  fileName,
  onChangeFileName,
  sheetName,
  onChangeSheetName,
  columns,
  onAddColumn,
  onRemoveColumn,
}: SidebarConfigProps) {
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [newColOptions, setNewColOptions] = useState('Option A, Option B, Option C');
  const [colError, setColError] = useState('');

  const handleAddColumnSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newColLabel.trim();
    if (!trimmed) {
      setColError('Enter a column name');
      return;
    }
    if (columns.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      setColError('Column already exists');
      return;
    }
    onAddColumn(trimmed, newColType, newColOptions);
    setNewColLabel('');
    setColError('');
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-72 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 lg:hidden">
        <span className="text-sm font-semibold text-slate-900">Workbook Setup</span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close workbook settings"
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section 1: Templates */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-xs font-semibold text-slate-500 tracking-wide mb-2.5">
          Templates
        </h2>
        <div className="space-y-1">
          {SHEET_TEMPLATES.map((tpl) => {
            const isActive = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  onSelectTemplate(tpl.id);
                  onCloseMobile();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="truncate">{tpl.name}</div>
                <div className="text-xs font-normal text-slate-500 truncate mt-0.5">
                  {tpl.columns.length} columns
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Export Settings */}
      <section className="p-4 border-b border-slate-200 space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 tracking-wide">
          Excel Output
        </h2>

        <div>
          <label
            htmlFor="workbook-filename"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            File Name
          </label>
          <input
            id="workbook-filename"
            type="text"
            value={fileName}
            onChange={(e) => onChangeFileName(e.target.value)}
            placeholder="data-entry-export"
            className="w-full px-2.5 py-1.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
          <p className="mt-1 text-xs text-slate-500 font-mono truncate">
            {sanitizeFileName(fileName)}
          </p>
        </div>

        <div>
          <label
            htmlFor="workbook-sheetname"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Sheet Tab Name
          </label>
          <input
            id="workbook-sheetname"
            type="text"
            maxLength={31}
            value={sheetName}
            onChange={(e) => onChangeSheetName(e.target.value)}
            placeholder="Sheet1"
            className="w-full px-2.5 py-1.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
          <p className="mt-1 text-xs text-slate-500 font-mono truncate">
            Tab: {sanitizeSheetName(sheetName)}
          </p>
        </div>
      </section>

      {/* Section 3: Columns */}
      <section className="p-4 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-slate-500 tracking-wide">
            Columns ({columns.length})
          </h2>
        </div>

        <ul className="space-y-1.5 mb-4">
          {columns.map((col) => (
            <li
              key={col.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50/70"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 truncate">
                  {col.label}
                  {col.required ? (
                    <span className="text-emerald-700 ml-1" title="Required field">
                      *
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-500">{TYPE_LABELS[col.type]}</div>
              </div>

              {columns.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveColumn(col.id)}
                  aria-label={`Remove column ${col.label}`}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddColumnSubmit} className="space-y-2.5 pt-3 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-700">Add Column</div>

          <div>
            <label htmlFor="new-col-name" className="sr-only">
              New column name
            </label>
            <input
              id="new-col-name"
              type="text"
              value={newColLabel}
              onChange={(e) => {
                setNewColLabel(e.target.value);
                if (colError) setColError('');
              }}
              placeholder="e.g. Department"
              className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="new-col-type" className="sr-only">
              New column type
            </label>
            <select
              id="new-col-type"
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as ColumnType)}
              className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Dropdown List</option>
            </select>
          </div>

          {newColType === 'select' && (
            <div>
              <label htmlFor="new-col-options" className="block text-[11px] text-slate-600 mb-1">
                Options (comma-separated)
              </label>
              <input
                id="new-col-options"
                type="text"
                value={newColOptions}
                onChange={(e) => setNewColOptions(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          )}

          {colError && (
            <p className="text-xs text-rose-600" role="alert">
              {colError}
            </p>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Column</span>
          </button>
        </form>
      </section>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarBody}</aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
