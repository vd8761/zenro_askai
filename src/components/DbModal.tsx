'use client';

import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { DbStats } from '@/lib/types';

interface DbModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStats: DbStats | null;
  onApplyDb: (config: { host: string; port: number; user: string; password?: string; database: string }) => void;
}

export default function DbModal({ isOpen, onClose, currentStats, onApplyDb }: DbModalProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>(currentStats?.database || 'shc_2026');

  const [host, setHost] = useState(currentStats?.host || 'localhost');
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState(currentStats?.database || 'shc_2026');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const testDb = mode === 'preset' ? selectedPreset : database;
    const testHost = mode === 'preset' ? 'localhost' : host;
    const testPort = mode === 'preset' ? 3306 : port;
    const testUser = mode === 'preset' ? 'root' : user;
    const testPass = mode === 'preset' ? '' : password;

    try {
      const res = await fetch('/api/db-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: testHost, port: testPort, user: testUser, password: testPass, database: testDb }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const finalDb = mode === 'preset' ? selectedPreset : database;
    const finalHost = mode === 'preset' ? 'localhost' : host;
    const finalPort = mode === 'preset' ? 3306 : port;
    const finalUser = mode === 'preset' ? 'root' : user;
    const finalPass = mode === 'preset' ? '' : password;

    onApplyDb({
      host: finalHost,
      port: Number(finalPort),
      user: finalUser,
      password: finalPass,
      database: finalDb,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Database size={20} className="modal-icon text-indigo" />
            <div>
              <h3>Remote Database Connection</h3>
              <p>Configure live or remote Zenro HRMS & Payroll MySQL database</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Active status card */}
          {currentStats && (
            <div className={`connection-status-card ${currentStats.status === 'connected' ? 'connected' : 'error'}`}>
              <div className="status-indicator-dot" />
              <div className="status-info">
                <strong>Current Active DB: {currentStats.database}</strong>
                <span>
                  {currentStats.status === 'connected'
                    ? `Connected on ${currentStats.host} • ${currentStats.employeeCount} Employees • ${currentStats.payslipCount} Payslips`
                    : `Connection Error: ${currentStats.error}`}
                </span>
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'preset' ? 'active' : ''}`}
              onClick={() => {
                setMode('preset');
                setTestResult(null);
              }}
            >
              Discovered Zenro Databases
            </button>
            <button
              className={`mode-tab ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => {
                setMode('custom');
                setTestResult(null);
              }}
            >
              Custom Remote MySQL Host
            </button>
          </div>

          {mode === 'preset' ? (
            <div className="preset-databases-list">
              {[
                {
                  id: 'shc_2026',
                  title: 'shc_2026 (Active & Updated)',
                  desc: '151 Active Staff, Live Attendance, Payslips & Hospital Payroll Data',
                },
                {
                  id: 'zenro_touchmark',
                  title: 'zenro_touchmark',
                  desc: '274 Active Employees, 1,515 Monthly Payslips, Loans & Department records',
                },
                {
                  id: 'zenro_app',
                  title: 'zenro_app',
                  desc: '64 Standard Zenro Core Schema Tables',
                },
                {
                  id: 'rupini_zenro',
                  title: 'rupini_zenro',
                  desc: 'Zenro Production Mirror Database',
                },
              ].map(db => (
                <label
                  key={db.id}
                  className={`preset-option-card ${selectedPreset === db.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(db.id)}
                >
                  <input
                    type="radio"
                    name="db_preset"
                    checked={selectedPreset === db.id}
                    onChange={() => setSelectedPreset(db.id)}
                  />
                  <div className="preset-details">
                    <span className="preset-name">{db.title}</span>
                    <span className="preset-desc">{db.desc}</span>
                  </div>
                  {selectedPreset === db.id && <Check size={16} className="preset-check text-green" />}
                </label>
              ))}
            </div>
          ) : (
            <div className="custom-db-form">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Host / IP Address</label>
                  <input
                    type="text"
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="e.g. 192.168.1.100 or db.zenro.internal"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                    placeholder="3306"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={user}
                    onChange={e => setUser(e.target.value)}
                    placeholder="root or zenro_user"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Database Name</label>
                <input
                  type="text"
                  value={database}
                  onChange={e => setDatabase(e.target.value)}
                  placeholder="e.g. zenro_touchmark"
                />
              </div>
            </div>
          )}

          {/* Test connection output */}
          {testResult && (
            <div className={`test-feedback ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? (
                <>
                  <ShieldCheck size={16} className="text-green" />
                  <span>
                    {testResult.message} ({testResult.latencyMs}ms latency)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-red" />
                  <span>{testResult.message}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleTest} disabled={testing} className="test-btn">
            {testing ? <RefreshCw size={14} className="spin" /> : <Server size={14} />}
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="footer-actions">
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button onClick={handleSave} className="apply-btn">
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
