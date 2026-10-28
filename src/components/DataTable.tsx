'use client';

import React, { useState, useMemo } from 'react';
import { Download, Search, ArrowUpDown, ChevronDown, ChevronUp, FileSpreadsheet, FileText, ExternalLink } from 'lucide-react';
import { buildPayslipPdfUrl } from '../lib/payslip-utils';

interface DataTableProps {
  columns: string[];
  rows: Record<string, any>[];
  title?: string;
}

// Helper to detect internal database surrogate primary keys and metadata columns that shouldn't be exposed to users
const isTechnicalIdCol = (colName: string): boolean => {
  const c = colName.toLowerCase().trim();
  // Keep business codes like emp_code, department_code, etc.
  if (c.includes('code')) return false;
  // Filter out internal surrogate IDs and metadata columns
  if (
    c === 'id' ||
    c.endsWith('_id') ||
    c.startsWith('id_') ||
    c === 'createdby' ||
    c === 'createdon' ||
    c === 'updatedon' ||
    c === 'deleted' ||
    c === 'status'
  ) {
    return true;
  }
  return false;
};

export default function DataTable({ columns, rows, title }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const appBaseUrl =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_LOGO_BASE_URL || 'http://localhost/shadithyahospital_zenro/'
      : 'http://localhost/shadithyahospital_zenro/';

  // Detect whether this table contains payslip records
  const isPayslipTable = useMemo(() => {
    return rows.some(
      r =>
        r.actual_payslip_id !== undefined ||
        r.payslip_month !== undefined ||
        (r.net_payable !== undefined && r.total_gross_monthly !== undefined)
    );
  }, [rows]);

  // Filter out internal technical database IDs (actual_payslip_id, employee_id, etc.)
  const visibleColumns = useMemo(() => {
    const filtered = columns.filter(col => !isTechnicalIdCol(col));
    return filtered.length > 0 ? filtered : columns;
  }, [columns]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, search, sortCol, sortAsc]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = visibleColumns.join(',');
    const csvContent = [
      header,
      ...rows.map(r =>
        visibleColumns
          .map(col => {
            const val = r[col];
            if (val === null || val === undefined) return '""';
            const s = String(val).replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zenro_payroll_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatHeader = (col: string) => {
    return col
      .replace(/_/g, ' ')
      .replace(/\bemp\b/gi, 'Employee')
      .replace(/\bdept\b/gi, 'Department')
      .replace(/\bdesig\b/gi, 'Designation')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'EM';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderCellContent = (val: any, col: string) => {
    if (val === null || val === undefined || val === '') {
      return <span className="cell-muted">-</span>;
    }

    const colLower = col.toLowerCase();

    // Employee Name with Initials Avatar
    if (colLower.includes('name') && !colLower.includes('dept') && !colLower.includes('department')) {
      const name = String(val);
      const initials = getInitials(name);
      return (
        <div className="emp-name-cell">
          <span className="emp-initials-badge">{initials}</span>
          <span className="emp-name-text">{name}</span>
        </div>
      );
    }

    // Designation badge
    if (colLower.includes('designation')) {
      return <span className="designation-badge">{String(val)}</span>;
    }

    // Department badge
    if (colLower.includes('department')) {
      return (
        <span className="department-badge">
          <span className="dept-indicator-dot" />
          <span>{String(val)}</span>
        </span>
      );
    }

    // Currency values
    if (/gross|salary|ctc|payout|payable|rate|deduction|loan|amount|incentive|allowance|pf|esi/i.test(colLower)) {
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (!isNaN(num)) {
        return (
          <span className="currency-cell">
            <span className="rupee-sym">₹</span>
            {Math.round(num).toLocaleString('en-IN')}
          </span>
        );
      }
    }

    // Dates & Months (format ISO dates and Date objects nicely e.g. "Sep 2026" or "29 Sep 2026")
    if (val instanceof Date || (typeof val === 'string' && (/^\d{4}-\d{2}-\d{2}/.test(val) || /GMT|UTC/i.test(val)))) {
      try {
        const d = val instanceof Date ? val : new Date(val);
        if (!isNaN(d.getTime())) {
          if (colLower.includes('month')) {
            return (
              <span className="date-badge">
                {d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            );
          }
          return (
            <span className="date-badge">
              {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          );
        }
      } catch {}
    }

    // Employee code
    if (colLower.includes('code')) {
      return <span className="code-badge">{String(val)}</span>;
    }

    if (typeof val === 'number') {
      return <span className="number-cell">{val.toLocaleString()}</span>;
    }

    return <span className="text-cell">{String(val)}</span>;
  };

  const isNumericCol = (col: string) =>
    /gross|salary|ctc|payout|payable|rate|deduction|loan|amount|incentive|allowance|pf|esi|total/i.test(col);

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <div className="data-table-title-group">
          <FileSpreadsheet size={16} className="text-blue" />
          <span className="data-table-title">{title || 'Query Records'}</span>
          <span className="data-table-pill">{filteredRows.length} rows</span>
        </div>

        <div className="data-table-actions">
          <div className="table-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search in records..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>


          <button onClick={exportCsv} className="export-csv-btn" title="Download Excel/CSV Spreadsheet">
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="table-scroll-wrapper">
        <table className="zenro-table">
          <thead>
            <tr>
              <th className="th-index">#</th>
              {visibleColumns.map(col => {
                const numeric = isNumericCol(col);
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`sortable-header ${numeric ? 'th-numeric' : ''}`}
                  >
                    <div className={`header-cell-content ${numeric ? 'justify-end' : ''}`}>
                      <span>{formatHeader(col)}</span>
                      {sortCol === col ? (
                        sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={11} className="sort-hint" />
                      )}
                    </div>
                  </th>
                );
              })}
              {isPayslipTable && (
                <th className="th-action text-center">Download Payslip</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1 + (isPayslipTable ? 1 : 0)} className="empty-table-cell">
                  No matching records found in this dataset
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'tr-striped' : ''}>
                  <td className="td-index">{(page - 1) * pageSize + idx + 1}</td>
                  {visibleColumns.map(col => {
                    const numeric = isNumericCol(col);
                    return (
                      <td key={col} className={`td-${col} ${numeric ? 'td-numeric' : ''}`}>
                        {renderCellContent(row[col], col)}
                      </td>
                    );
                  })}
                  {isPayslipTable && (
                    <td className="td-action text-center">
                      {(() => {
                        const targetUrl = buildPayslipPdfUrl(row, appBaseUrl);
                        if (!targetUrl) {
                          return <span className="cell-muted text-xs">-</span>;
                        }
                        return (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="row-payslip-pdf-btn"
                            title={`Download ${row.emp_name || 'Employee'}'s Official Payslip PDF`}
                          >
                            <Download size={12} />
                            <span>Download Payslip</span>
                            <ExternalLink size={10} />
                          </a>
                        );
                      })()}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <span className="pagination-info">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="pagination-buttons">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="page-nav-btn"
            >
              Previous
            </button>
            <span className="current-page-pill">{page}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="page-nav-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
