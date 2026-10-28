'use client';

import React, { useState } from 'react';
import { Copy, Check, Volume2, VolumeX, Download, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import MarkdownRenderer from './MarkdownRenderer';
import DataTable from './DataTable';
import MetricCards from './MetricCards';

interface MessageItemProps {
  message: ChatMessage;
  orgLogoUrl?: string;
  orgTitle?: string;
}

export default function MessageItem({ message, orgLogoUrl, orgTitle }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mountedTime, setMountedTime] = useState<string>('');

  React.useEffect(() => {
    try {
      setMountedTime(new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setMountedTime('');
    }
  }, [message.timestamp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined') return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const clean = message.content.replace(/[*_#`~[\]]/g, '').replace(/https?:\/\/\S+/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    
    // Auto-detect language for speech synthesis
    if (/[\u0B80-\u0BFF]/.test(clean)) {
      utterance.lang = 'ta-IN'; // Tamil
    } else if (/[\u0900-\u097F]/.test(clean)) {
      utterance.lang = 'hi-IN'; // Hindi
    } else if (/[\u0C00-\u0C7F]/.test(clean)) {
      utterance.lang = 'te-IN'; // Telugu
    } else if (/[\u0D00-\u0D7F]/.test(clean)) {
      utterance.lang = 'ml-IN'; // Malayalam
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleDownload = () => {
    const text = message.content;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePrefix = (orgTitle || 'zenro_payroll').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    a.download = `${safePrefix}_payroll_report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isUser = message.role === 'user';
  const displayOrgTitle = orgTitle || 'Zenro Payroll';
  const displayOrgLogo = orgLogoUrl || '';
  const senderTitle = orgTitle ? `${orgTitle} Admin` : 'Payroll Admin';

  if (isUser) {
    return (
      <div className="message-row user-message-row">
        <div className="message-container">
          <div className="message-avatar user-avatar" title={senderTitle}>
            {displayOrgLogo ? (
              <img
                src={displayOrgLogo}
                alt={displayOrgTitle}
                className="avatar-logo-img user-logo-img"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className="avatar-fallback user-fallback" style={{ display: displayOrgLogo ? 'none' : 'flex' }}>
              <User size={16} />
            </div>
          </div>
          <div className="message-content-wrapper">
            <div className="message-header">
              <span className="sender-name">{senderTitle}</span>
              {mountedTime && <span className="message-time">{mountedTime}</span>}
            </div>
            <div className="markdown-body">
              <p>{message.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row assistant-message-row">
      <div className="message-container">
        <div className="message-avatar assistant-avatar" title="Zenro Ask AI">
          <img
            src="/zenro-icon.svg"
            alt="Zenro Ask AI"
            className="avatar-logo-img zenro-logo-img"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="avatar-fallback assistant-fallback" style={{ display: 'none' }}>
            <Sparkles size={16} />
          </div>
        </div>
        <div className="message-content-wrapper">
          <div className="message-header">
            <span className="sender-name">Zenro Ask AI</span>
            {mountedTime && <span className="message-time">{mountedTime}</span>}
          </div>

          {/* Metric KPI cards */}
          {message.metrics && message.metrics.length > 0 && (
            <MetricCards metrics={message.metrics} />
          )}

          {/* Markdown Content */}
          <div className="markdown-body">
            <MarkdownRenderer content={message.content} hideSingleBullet={true} />
          </div>

          {/* Tabular Data View */}
          {message.tabularData && message.tabularData.rows.length > 0 && (
            <DataTable
              columns={message.tabularData.columns}
              rows={message.tabularData.rows}
              title={`${displayOrgTitle} Records`}
            />
          )}

          {/* Actions Bar */}
          <div className="message-actions-bar">
            <button
              onClick={handleCopy}
              className="action-icon-btn"
              title="Copy response"
            >
              {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleSpeak}
              className={`action-icon-btn ${isSpeaking ? 'active-speaking' : ''}`}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="action-icon-btn"
              title="Download report"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
