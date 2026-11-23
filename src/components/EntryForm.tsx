import { useRef, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '../utils/sheetLogic';

interface EntryFormProps {
  columns: ColumnDef[];
  draft: Record<string, string>;
  errors: Record<string, string>;
  onChangeField: (colId: string, value: string) => void;
  onSubmit: () => boolean;
}

export function EntryForm({
  columns,
  draft,
  errors,
  onChangeField,
  onSubmit,
}: EntryFormProps) {
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = onSubmit();
    if (ok) {
      firstInputRef.current?.focus();
    }
  };

  return (
    <section
      aria-label="New row entry form"
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Add Row</h2>
        <span className="hidden sm:inline text-xs text-slate-500">
          Fill fields below and press Enter or click Add Row
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
          {columns.map((col, idx) => {
            const inputId = `entry-${col.id}`;
            const val = draft[col.id] ?? '';
            const err = errors[col.id];

            return (
              <div key={col.id} className="min-w-0">
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-slate-700 mb-1 truncate"
                >
                  {col.label}
                  {col.required && (
                    <span className="text-emerald-700 ml-0.5" aria-hidden="true">
                      *
                    </span>
                  )}
                </label>

                {col.type === 'select' && col.options && col.options.length > 0 ? (
                  <select
                    id={inputId}
                    ref={idx === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                    value={val}
                    onChange={(e) => onChangeField(col.id, e.target.value)}
                    aria-invalid={Boolean(err)}
                    className={`w-full h-9 px-2.5 text-sm bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 ${
                      err ? 'border-rose-500' : 'border-slate-300'
                    }`}
                  >
                    {col.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={inputId}
                    ref={idx === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                    type={col.type === 'date' ? 'date' : col.type === 'number' ? 'text' : 'text'}
                    inputMode={col.type === 'number' ? 'decimal' : undefined}
                    value={val}
                    onChange={(e) => onChangeField(col.id, e.target.value)}
                    placeholder={
                      col.type === 'number'
                        ? '0.00'
                        : col.type === 'date'
                        ? 'YYYY-MM-DD'
                        : `Enter ${col.label.toLowerCase()}`
                    }
                    aria-invalid={Boolean(err)}
                    className={`w-full h-9 px-2.5 text-sm bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 ${
                      col.type === 'number' ? 'font-mono tabular-nums text-right' : ''
                    } ${err ? 'border-rose-500' : 'border-slate-300'}`}
                  />
                )}

                {err && (
                  <p className="mt-1 text-xs text-rose-600" role="alert">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Row</span>
          </button>
        </div>
      </form>
    </section>
  );
}
