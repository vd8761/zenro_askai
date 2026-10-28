'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PanelLeft,
  Bot,
  ShieldAlert,
  Lock,
  ExternalLink,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MessageItem from '@/components/MessageItem';
import ChatInput from '@/components/ChatInput';
import QuickPrompts from '@/components/QuickPrompts';
import DbModal from '@/components/DbModal';
import LanguageDropdown from '@/components/LanguageDropdown';
import { ChatMessage, ChatSession, DbStats } from '@/lib/types';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect (All Languages)' },
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'ar', label: 'العربية (Arabic)' },
];

export default function ZenroAskAiPage() {
  // Authentication & Tenant Session State
  const [authState, setAuthState] = useState<{
    checking: boolean;
    authenticated: boolean;
    error?: string;
    tenant?: {
      db_name: string;
      app_base_url: string;
      org_title?: string;
      org_logo?: string;
      user_id?: string | number;
    };
  }>({ checking: true, authenticated: false });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbOverride, setDbOverride] = useState<{ database?: string; host?: string } | undefined>(undefined);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [thinkingPhrase, setThinkingPhrase] = useState<string>('Analyzing payroll records...');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<boolean>(false);

  // Check token authentication on page mount
  const checkAuthentication = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      const url = token ? `/api/auth/session?token=${encodeURIComponent(token)}` : '/api/auth/session';
      const res = await fetch(url);
      const data = await res.json();

      if (data.authenticated && data.session) {
        // Strip token cleanly from browser address bar
        if (token && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        setAuthState({
          checking: false,
          authenticated: true,
          tenant: data.session,
        });

        const tenantDb = data.session.db_name;
        setDbOverride({ database: tenantDb, host: 'localhost' });

        fetchSessions(tenantDb);
        fetchDbStats({ database: tenantDb });
      } else {
        setAuthState({
          checking: false,
          authenticated: false,
          error: data.error || 'Authentication required.',
        });
      }
    } catch (e: any) {
      setAuthState({
        checking: false,
        authenticated: false,
        error: e.message || 'Authentication error',
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');

    const savedLang = localStorage.getItem('zenro_language');
    if (savedLang) setSelectedLanguage(savedLang);

    const savedSidebar = localStorage.getItem('zenro_sidebar');
    if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true');

    checkAuthentication();
  }, [checkAuthentication]);

  const fetchSessions = async (databaseName?: string) => {
    try {
      const url = databaseName ? `/api/sessions?database=${encodeURIComponent(databaseName)}` : '/api/sessions';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          const firstId = data.sessions[0].id;
          setActiveSessionId(firstId);
          loadSessionMessages(firstId, databaseName);
        }
      }
    } catch (e) {
      console.error('Failed to fetch sessions from DB:', e);
    }
  };

  const fetchDbStats = async (override?: { database?: string; host?: string }) => {
    try {
      const url = new URL('/api/db-status', window.location.origin);
      if (override?.database) url.searchParams.append('database', override.database);
      if (override?.host) url.searchParams.append('host', override.host);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success && data.stats) {
        setDbStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch DB stats:', e);
    }
  };

  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    localStorage.setItem('zenro_language', code);
  };

  const loadSessionMessages = async (sessionId: string, databaseName?: string) => {
    try {
      const url = databaseName
        ? `/api/sessions/${sessionId}/messages?database=${encodeURIComponent(databaseName)}`
        : `/api/sessions/${sessionId}/messages`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to load session messages:', e);
      setMessages([]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, loading]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setStreamingContent(null);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    loadSessionMessages(id, dbOverride?.database);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete session in DB:', e);
    }
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        loadSessionMessages(updated[0].id, dbOverride?.database);
      } else {
        handleNewChat();
      }
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const updated = sessions.map(s => (s.id === id ? { ...s, title: newTitle } : s));
    setSessions(updated);
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {
      console.error('Failed to rename session in DB:', e);
    }
  };

  const typewriterStream = async (fullText: string) => {
    setIsStreaming(true);
    streamAbortRef.current = false;
    let current = '';

    const chunkSize = Math.max(2, Math.floor(fullText.length / 80));

    for (let i = 0; i < fullText.length; i += chunkSize) {
      if (streamAbortRef.current) break;
      current += fullText.slice(i, i + chunkSize);
      setStreamingContent(current);
      await new Promise(r => setTimeout(r, 16));
    }

    setIsStreaming(false);
    setStreamingContent(null);
    return current;
  };

  const handleStopStreaming = () => {
    streamAbortRef.current = true;
    setIsStreaming(false);
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || loading || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    setLoading(true);

    const orgDisplayName = authState.tenant?.org_title || dbStats?.orgTitle || 'Zenro Payroll';
    const phrases = [
      `Scanning ${orgDisplayName} database...`,
      'Compiling payroll figures & staff records...',
      'Synthesizing verified HR data...',
      'Generating multilingual response...',
    ];
    let phraseIdx = 0;
    const phraseInterval = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      setThinkingPhrase(phrases[phraseIdx]);
    }, 1800);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          query: query.trim(),
          sessionId: activeSessionId,
          language: selectedLanguage,
          dbConfig: dbOverride,
        }),
      });

      clearInterval(phraseInterval);
      const resData = await res.json();
      setLoading(false);

      if (resData.success) {
        const {
          sessionId,
          sessionTitle,
          answer,
          sqlExecution,
          tabularData,
          metrics,
          sources,
          messageId,
        } = resData;

        if (sessionId && sessionId !== activeSessionId) {
          setActiveSessionId(sessionId);
          setSessions(prev => {
            const exists = prev.some(s => s.id === sessionId);
            if (!exists) {
              const newSession: ChatSession = {
                id: sessionId,
                title: sessionTitle || (query.length > 40 ? `${query.substring(0, 40)}...` : query),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              return [newSession, ...prev];
            }
            return prev;
          });
        }

        const finalAnswer = await typewriterStream(answer);

        const assistantMsg: ChatMessage = {
          id: messageId ? String(messageId) : `msg_a_${Date.now()}`,
          role: 'assistant',
          content: finalAnswer || answer,
          timestamp: new Date().toISOString(),
          sqlExecution,
          tabularData,
          metrics,
          sources,
        };

        setMessages([...updatedWithUser, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Processing Notice:**\n\n${resData.error || 'Failed to process query. Please check database connectivity.'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages([...updatedWithUser, errorMsg]);
      }
    } catch (e: any) {
      clearInterval(phraseInterval);
      setLoading(false);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Network Error:**\n\nCould not reach the AI payroll service. (${e.message})`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedWithUser, errorMsg]);
    }
  };

  const handleApplyDb = (newConfig: { database: string; host: string }) => {
    setDbOverride(newConfig);
    fetchDbStats(newConfig);
    setDbModalOpen(false);
  };

  // 1. Loading State while verifying session
  if (authState.checking) {
    return (
      <div className="zenro-auth-gatekeeper-container">
        <div className="auth-gatekeeper-card">
          <div className="auth-gatekeeper-logo">
            <img src="/zenro-icon.svg" alt="Zenro Ask AI" />
            <span className="auth-brand-badge">Zenro Ask AI</span>
          </div>
          <div className="auth-spinner"></div>
          <p className="auth-loading-text">Verifying Zenro Payroll session...</p>
        </div>
      </div>
    );
  }

  // 2. Gatekeeper Screen when unauthenticated
  if (!authState.authenticated) {
    return (
      <div className="zenro-auth-gatekeeper-container">
        <div className="auth-gatekeeper-card">
          <div className="auth-lock-icon">
            <ShieldAlert size={36} />
          </div>
          <div className="auth-gatekeeper-logo">
            <img src="/zenro-icon.svg" alt="Zenro Ask AI" />
            <span className="auth-brand-badge">Zenro Ask AI Copilot</span>
          </div>
          <h2>Authentication Required</h2>
          <p className="auth-gatekeeper-desc">
            Zenro Ask AI is securely integrated with your <strong>Zenro Payroll</strong> portal.
            To access Ask AI, please log in to your authorized Zenro Payroll account and click the <strong>Ask AI</strong> button in your dashboard.
          </p>
          <div className="auth-notice-box">
            🔒 Direct unauthenticated access to employee payroll and confidential records is strictly restricted.
          </div>
          {authState.tenant?.app_base_url && (
            <a href={authState.tenant.app_base_url} className="auth-portal-btn">
              <span>Return to Zenro Payroll</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentOrgTitle = authState.tenant?.org_title || dbStats?.orgTitle || 'Zenro Payroll';
  const currentOrgLogo = authState.tenant?.org_logo || dbStats?.orgLogoUrl || '/uploads/site_logo/images.jpg';

  return (
    <div className="zenro-app-layout">
      {/* Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => {
          const next = !sidebarOpen;
          setSidebarOpen(next);
          localStorage.setItem('zenro_sidebar', String(next));
        }}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        dbStats={dbStats}
        onOpenDbModal={() => setDbModalOpen(true)}
        theme="light"
        onToggleTheme={() => {}}
      />

      {/* Main Content Area */}
      <main className="zenro-main-content">
        {/* Top Header */}
        <header className="zenro-chat-header">
          <div className="header-left">
            {!sidebarOpen && (
              <button
                onClick={() => {
                  setSidebarOpen(true);
                  localStorage.setItem('zenro_sidebar', 'true');
                }}
                className="header-icon-btn"
                title="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}

            <div className="header-title-box">
              <span className="current-session-title">
                {activeSession?.title || `${currentOrgTitle} AI Copilot`}
              </span>
            </div>
          </div>

          <div className="header-right">
            {/* Modern Language Selector Dropdown */}
            <LanguageDropdown
              selectedCode={selectedLanguage}
              onSelectLanguage={handleLanguageChange}
            />

            {/* Organisation Logo / Avatar */}
            <div className="header-user-avatar" title={`${currentOrgTitle} - Admin`}>
              {currentOrgLogo ? (
                <img
                  src={currentOrgLogo}
                  alt={currentOrgTitle}
                  className="header-org-logo-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerText = currentOrgTitle.slice(0, 2).toUpperCase();
                    }
                  }}
                />
              ) : (
                currentOrgTitle.slice(0, 2).toUpperCase()
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Chat Area */}
        <div className="chat-scroll-area" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <QuickPrompts
              onSelectPrompt={handleSendMessage}
              language={selectedLanguage}
              orgTitle={currentOrgTitle}
            />
          ) : (
            <div className="messages-stream">
              {messages.map(m => (
                <MessageItem
                  key={m.id}
                  message={m}
                  orgLogoUrl={currentOrgLogo}
                  orgTitle={currentOrgTitle}
                />
              ))}

              {/* Streaming reply */}
              {isStreaming && streamingContent && (
                <div className="message-row assistant-message-row">
                  <div className="message-container">
                    <div className="message-avatar assistant-avatar" title="Zenro Ask AI">
                      <img
                        src="/zenro-icon.svg"
                        alt="Zenro Ask AI"
                        className="avatar-logo-img zenro-logo-img"
                      />
                    </div>
                    <div className="message-content-wrapper">
                      <div className="message-header">
                        <span className="sender-name">Zenro Ask AI</span>
                        <span className="streaming-badge">Streaming live...</span>
                      </div>
                      <div className="markdown-body">
                        <p>{streamingContent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking loader */}
              {loading && (
                <div className="message-row assistant-message-row">
                  <div className="message-container">
                    <div className="message-avatar assistant-avatar">
                      <Bot size={18} />
                    </div>
                    <div className="message-content-wrapper">
                      <div className="thinking-bubble">
                        <div className="thinking-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <span className="thinking-text">{thinkingPhrase}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Chat Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={loading || isStreaming}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          language={selectedLanguage}
          orgTitle={currentOrgTitle}
        />
      </main>

      {/* Database Connection Modal */}
      <DbModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        onApplyDb={(config) => handleApplyDb({ database: config.database, host: config.host })}
        currentStats={dbStats}
      />
    </div>
  );
}
