import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  computeColumnStats,
  type ColumnDef,
  type RowData,
  type SortConfig,
} from '../utils/sheetLogic';

interface DataGridProps {
  columns: ColumnDef[];
  rows: RowData[];
  totalRowCount: number;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  sort: SortConfig | null;
  onToggleSort: (colId: string) => void;
  onUpdateCell: (rowId: string, colId: string, value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onClearAllRows: () => void;
  onLoadSampleRows: () => void;
}

function formatStatNumber(val: number): string {
  return Number.isInteger(val)
    ? val.toLocaleString()
    : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DataGrid({
  columns,
  rows,
  totalRowCount,
  searchQuery,
  onChangeSearch,
  sort,
  onToggleSort,
  onUpdateCell,
  onDeleteRow,
  onClearAllRows,
  onLoadSampleRows,
}: DataGridProps) {
  const stats = computeColumnStats(rows, columns);
  const hasNumericColumns = columns.some((c) => c.type === 'number');

  return (
    <section
      aria-label="Spreadsheet data table"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-md">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="grid-search" className="sr-only">
              Search rows
            </label>
            <input
              id="grid-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Filter rows..."
              className="w-full h-9 pl-8 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          <div className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
            {searchQuery.trim()
              ? `${rows.length} of ${totalRowCount} rows`
              : `${totalRowCount} ${totalRowCount === 1 ? 'row' : 'rows'}`}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            {columns.length} {columns.length === 1 ? 'col' : 'cols'}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLoadSampleRows}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Load Sample</span>
          </button>

          {totalRowCount > 0 && (
            <button
              type="button"
              onClick={onClearAllRows}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-slate-200 rounded-md hover:bg-rose-50 hover:border-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Clear Rows</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty States or Table */}
      {totalRowCount === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">No rows in this sheet yet</p>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Use the Add Row form above to enter your data, or load sample rows to test the Excel export right away.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLoadSampleRows}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Load Sample Rows
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">No matching rows</p>
          <p className="mt-1 text-sm text-slate-500">
            No entries match &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => onChangeSearch('')}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th
                  scope="col"
                  className="w-12 px-3 py-2.5 text-xs font-semibold text-slate-500 font-mono tabular-nums text-center border-r border-slate-200"
                >
                  #
                </th>
                {columns.map((col) => {
                  const isSorted = sort?.columnId === col.id;
                  const widthClass =
                    col.type === 'number'
                      ? 'min-w-[105px] w-28'
                      : col.type === 'date'
                      ? 'min-w-[145px]'
                      : col.type === 'select'
                      ? 'min-w-[140px]'
                      : 'min-w-[210px]';
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      className={`px-3 py-2.5 text-xs font-semibold text-slate-700 border-r border-slate-200 ${widthClass} ${
                        col.type === 'number' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleSort(col.id)}
                        aria-label={`Sort by ${col.label}`}
                        className={`inline-flex items-center gap-1.5 hover:text-slate-950 transition-colors cursor-pointer ${
                          col.type === 'number' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span className="truncate">{col.label}</span>
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="w-14 px-2 py-2.5 text-xs font-semibold text-slate-500 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="px-3 py-1.5 text-xs text-slate-400 font-mono tabular-nums text-center border-r border-slate-200 bg-slate-50/40">
                    {rowIndex + 1}
                  </td>

                  {columns.map((col) => {
                    const cellVal = row.values[col.id] ?? '';
                    return (
                      <td
                        key={col.id}
                        className="p-0 border-r border-slate-200 align-middle"
                      >
                        {col.type === 'select' && col.options && col.options.length > 0 ? (
                          <select
                            aria-label={`Row ${rowIndex + 1} ${col.label}`}
                            value={cellVal}
                            onChange={(e) => onUpdateCell(row.id, col.id, e.target.value)}
                            className="w-full h-10 px-3 text-sm text-slate-900 bg-transparent focus:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-700"
                          >
                            {!col.options.includes(cellVal) && cellVal !== '' && (
                              <option value={cellVal}>{cellVal}</option>
                            )}
                            {col.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={`Row ${rowIndex + 1} ${col.label}`}
                            type={col.type === 'date' ? 'date' : 'text'}
                            inputMode={col.type === 'number' ? 'decimal' : undefined}
                            value={cellVal}
                            onChange={(e) => onUpdateCell(row.id, col.id, e.target.value)}
                            className={`w-full h-10 px-3 text-sm text-slate-900 bg-transparent focus:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-700 ${
                              col.type === 'number' ? 'font-mono tabular-nums text-right' : ''
                            }`}
                          />
                        )}
                      </td>
                    );
                  })}

                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(row.id)}
                      aria-label={`Delete row ${rowIndex + 1}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {hasNumericColumns && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-center border-r border-slate-200">
                    Sum
                  </td>
                  {columns.map((col) => {
                    const st = stats[col.id];
                    return (
                      <td
                        key={col.id}
                        className={`px-3 py-2.5 text-xs border-r border-slate-200 ${
                          col.type === 'number'
                            ? 'text-right font-mono tabular-nums font-semibold text-slate-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {col.type === 'number' && st?.sum !== undefined ? (
                          <span>{formatStatNumber(st.sum)}</span>
                        ) : (
                          <span>{st?.filled ?? 0} filled</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
