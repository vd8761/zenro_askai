/**
 * Zenro Payroll - Official Payslip PDF URL Builder & Parameter Validator
 *
 * CRITICAL RULE:
 * 'newpayslip.php' is the official TCPDF payslip generator script in Zenro Payroll.
 * It requires the following query parameters:
 *   - 'm': Month number (1 - 12)
 *   - 'y': 4-digit Year (e.g. 2026)
 *   - 'emp_ID': Employee ID (e.g. 1)
 *
 * Invoking 'newpayslip.php' bare (without 'm' and 'y') results in MySQL queries matching 0 rows,
 * producing an empty/blank PDF with only the hospital header.
 * Therefore, we must NEVER generate or expose a bare link to 'newpayslip.php'.
 */

export interface PayslipParams {
  m: string;
  y: string;
  emp_ID: string;
  monthStr: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Extracts month, year, and employee ID from any payslip record row.
 * Returns null if month or year cannot be determined.
 */
export function extractPayslipParams(row: Record<string, any>): PayslipParams | null {
  if (!row || typeof row !== 'object') return null;

  // 1. Employee ID
  const rawEmpId =
    row.employee_id ??
    row.employee_ID ??
    row.emp_id ??
    row.emp_ID ??
    row.empID ??
    '';

  const emp_ID = String(rawEmpId).trim();

  // 2. Month and Year
  let m = '';
  let y = '';
  let monthStr = '';

  const rawMonth = row.payslip_month ?? row.salary_month ?? row.month_date ?? row.date;

  if (typeof rawMonth === 'string' && rawMonth.trim()) {
    const trimmed = rawMonth.trim();
    // Case A: YYYY-MM or YYYY-MM-DD (e.g., '2026-09-30' or '2026-09')
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) {
      y = isoMatch[1];
      const parsedMonth = parseInt(isoMatch[2], 10);
      m = String(parsedMonth);
      monthStr = `${MONTH_NAMES[parsedMonth - 1] || m} ${y}`;
    } else {
      // Try JS Date parsing
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        y = String(d.getFullYear());
        m = String(d.getMonth() + 1);
        monthStr = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    }
  } else if (rawMonth instanceof Date && !isNaN(rawMonth.getTime())) {
    y = String(rawMonth.getFullYear());
    m = String(rawMonth.getMonth() + 1);
    monthStr = rawMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  // Fallbacks: explicit separate columns if query returned MONTH(payslip_month) as m, YEAR(...) as y
  if (!m && row.m !== undefined) {
    m = String(parseInt(String(row.m), 10));
  } else if (!m && row.month !== undefined) {
    m = String(parseInt(String(row.month), 10));
  }

  if (!y && row.y !== undefined) {
    y = String(row.y);
  } else if (!y && row.year !== undefined) {
    y = String(row.year);
  }

  // Validate that m is 1..12 and y is a 4-digit number
  const numM = parseInt(m, 10);
  const numY = parseInt(y, 10);
  if (isNaN(numM) || numM < 1 || numM > 12 || isNaN(numY) || numY < 1900 || numY > 2100) {
    return null;
  }

  if (!monthStr) {
    monthStr = `${MONTH_NAMES[numM - 1] || m} ${y}`;
  }

  return { m, y, emp_ID, monthStr };
}

/**
 * Builds the exact, secure, and fully-parameterized URL to newpayslip.php.
 * Returns null if the required parameters (m, y, emp_ID) are missing,
 * ensuring bare 'newpayslip.php' is NEVER invoked.
 */
export function buildPayslipPdfUrl(row: Record<string, any>, appBaseUrl?: string): string | null {
  const params = extractPayslipParams(row);
  if (!params || !params.emp_ID) {
    return null; // Do NOT return bare newpayslip.php without parameters
  }

  const base = appBaseUrl
    ? (appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`)
    : (process.env.NEXT_PUBLIC_LOGO_BASE_URL || 'http://localhost/shadithyahospital_zenro/');

  return `${base}newpayslip.php?m=${encodeURIComponent(params.m)}&y=${encodeURIComponent(params.y)}&emp_ID=${encodeURIComponent(params.emp_ID)}`;
}
