export interface SqlExecutionResult {
  query: string;
  database: string;
  executionTimeMs: number;
  rowCount: number;
  columns: string[];
  rows: Record<string, any>[];
  readOnlyVerified: boolean;
  error?: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  subtext?: string;
  type?: 'currency' | 'number' | 'percentage' | 'text';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sqlExecution?: SqlExecutionResult;
  tabularData?: {
    columns: string[];
    rows: Record<string, any>[];
  };
  metrics?: MetricCard[];
  sources?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  pinned?: boolean;
}

export interface DbConnectionConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

export interface DbStats {
  database: string;
  host: string;
  tablesCount: number;
  employeeCount: number;
  payslipCount: number;
  departmentCount: number;
  status: 'connected' | 'error';
  error?: string;
  orgTitle?: string;
  orgLogo?: string;
  orgLogoUrl?: string;
}

export interface QuickPrompt {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'payroll' | 'salary' | 'attendance' | 'loans' | 'leaves' | 'headcount';
  prompt: string;
}
