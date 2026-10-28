'use client';

import React, { useState } from 'react';
import { Database, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, Terminal, ShieldCheck } from 'lucide-react';
import { SqlExecutionResult } from '@/lib/types';

interface SqlInspectorProps {
  sqlExecution: SqlExecutionResult;
  orgTitle?: string;
}

export default function SqlInspector({ sqlExecution, orgTitle }: SqlInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySql = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sqlExecution.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sql-inspector-card">
      <div className="sql-inspector-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="sql-inspector-meta">
          <div className="db-badge">
            <Database size={13} className="text-purple" />
            <span>{orgTitle || 'Shadithya Hospital'}</span>
          </div>

          <div className="latency-badge badge-blue">
            <span>{sqlExecution.executionTimeMs}ms execution</span>
          </div>

          <div className="rows-badge">
            <span>{sqlExecution.rowCount} verified records</span>
          </div>

          {sqlExecution.readOnlyVerified && (
            <div className="verified-badge" title="Query strictly verified as read-only SELECT">
              <ShieldCheck size={13} />
              <span>Verified Read-Only</span>
            </div>
          )}
        </div>

        <div className="sql-inspector-toggle">
          <span className="toggle-label">{isOpen ? 'Hide Query' : 'View Source Query'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div className="sql-inspector-body">
          <div className="sql-code-header">
            <div className="code-title">
              <Terminal size={13} className="text-purple" />
              <span>Hospital Database Query:</span>
            </div>
            <button onClick={copySql} className="copy-sql-btn" title="Copy SQL">
              {copied ? (
                <>
                  <Check size={12} className="text-green" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <div className="sql-code-wrapper">
            <pre className="sql-code-block">
              <code>{sqlExecution.query}</code>
            </pre>
          </div>
          {sqlExecution.error && (
            <div className="sql-error-box">
              <strong>Query Execution Error:</strong> {sqlExecution.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
