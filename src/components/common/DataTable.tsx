import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDeviceDrawer } from '../../context/DeviceDrawerContext';

interface DataTableProps<T extends object> {
  data: T[];
  columns: ColumnDef<T, any>[];
  pageSize?: number;
  searchPlaceholder?: string;
  onDeviceClick?: (deviceName: string) => void;
  exportFileName?: string;
  /** Tailwind height class for the scrollable table body, used to align card heights across a row. */
  bodyHeightClass?: string;
}

export function DataTable<T extends object>({
  data,
  columns,
  pageSize = 10,
  searchPlaceholder = 'Filter records...',
  onDeviceClick,
  exportFileName = 'netops-data',
  bodyHeightClass = 'max-h-[360px]',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const { openDeviceDrawer } = useDeviceDrawer();

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0] as object).join(',');
    const rows = data.map((row) =>
      Object.values(row as object)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFileName}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full space-y-2 font-sans text-xs">
      {/* Search & Export Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0E1017] border border-white/10 rounded-md text-[#e5e5e5] placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E222D] border border-white/10 text-[#c5a059] hover:bg-white/5 rounded-md transition-colors text-xs tracking-wider uppercase font-medium"
          title="Export as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Table Area */}
      <div className={`overflow-auto border border-white/10 rounded-lg ${bodyHeightClass}`}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#1E222D] z-10 border-b border-white/10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="p-2.5 uppercase tracking-[0.2em] text-[10px] font-medium text-white/40 hover:text-[#c5a059] cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="w-3 h-3 text-[#c5a059]" />,
                        desc: <ChevronDown className="w-3 h-3 text-[#c5a059]" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-white/5">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center p-6 text-white/30">
                  No records match filter
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-white/5 ${
                    idx % 2 === 0 ? 'bg-[#151821]' : 'bg-[#11141B]'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    // Check if cell contains device string to make clickable
                    const val = String(cell.getValue() || '');
                    const isDeviceCol =
                      cell.column.id.toLowerCase().includes('device') ||
                      cell.column.id.toLowerCase().includes('switch') ||
                      cell.column.id.toLowerCase().includes('gateway') ||
                      cell.column.id.toLowerCase().includes('controller') ||
                      cell.column.id.toLowerCase().includes('peer') ||
                      cell.column.id.toLowerCase().includes('target');

                    return (
                      <td key={cell.id} className="p-2.5 text-[#e5e5e5] whitespace-nowrap">
                        {isDeviceCol && val && val !== 'n/a' && val !== 'NEVER' ? (
                          <button
                            onClick={() => {
                              if (onDeviceClick) onDeviceClick(val);
                              else openDeviceDrawer(val);
                            }}
                            className="text-[#c5a059] underline underline-offset-2 hover:text-[#d4b574] font-medium transition-colors"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </button>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between pt-2 text-white/40 text-[11px]">
        <div>
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} entries
        </div>

        <div className="flex items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="bg-[#0E1017] border border-white/10 rounded px-2 py-1 text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 border border-white/10 rounded hover:bg-white/5 disabled:opacity-40 text-[#c5a059]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 border border-white/10 rounded hover:bg-white/5 disabled:opacity-40 text-[#c5a059]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
