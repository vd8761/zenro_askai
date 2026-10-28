'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
} from 'lucide-react';
import { ChatSession, DbStats } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  dbStats: DbStats | null;
  onOpenDbModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  dbStats,
  onOpenDbModal,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteSession(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = React.useMemo(() => {
    if (!isMounted) {
      return {
        Today: filteredSessions,
        Yesterday: [],
        'Previous 7 Days': [],
        'Previous 30 Days': [],
        Older: [],
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    filteredSessions.forEach(s => {
      const d = new Date(s.updatedAt || s.createdAt);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) groups.Today.push(s);
      else if (diffDays === 1) groups.Yesterday.push(s);
      else if (diffDays <= 7) groups['Previous 7 Days'].push(s);
      else if (diffDays <= 30) groups['Previous 30 Days'].push(s);
      else groups.Older.push(s);
    });

    return groups;
  }, [filteredSessions, isMounted]);

  return (
    <aside className={`zenro-sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Top Brand & Actions */}
      <div className="sidebar-top">
        <div className="brand-row">
          <div className="brand-logo-group">
            <div className="brand-icon-wrapper">
              <img src="/zenro-icon.svg" alt="Zenro Logo" className="brand-icon-img" />
            </div>
            <div className="brand-title-box">
              <div className="brand-name-row">
                <span className="brand-name-zenro">Zenro</span>
                <span className="brand-badge-ai">Ask AI</span>
              </div>
              <span className="brand-subtitle">Payroll Copilot</span>
            </div>
          </div>
          <button onClick={onToggle} className="sidebar-collapse-btn" title="Toggle sidebar">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button onClick={onNewChat} className="new-chat-btn" title="Start new conversation (Ctrl+K)">
          <div className="new-chat-left">
            <Plus size={16} className="new-chat-plus" />
            <span>New Chat</span>
          </div>
          <kbd className="new-chat-kbd">⌘K</kbd>
        </button>

        {/* Search */}
        <div className="sidebar-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="sidebar-sessions-list">
        {filteredSessions.length === 0 ? (
          <div className="empty-sessions-notice">
            <span>No conversations yet</span>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={groupTitle} className="session-group">
                <span className="group-title">{groupTitle}</span>
                <div className="group-items">
                  {list.map(s => {
                    const isActive = s.id === activeSessionId;
                    const isEditing = editingId === s.id;
                    const isConfirming = confirmDeleteId === s.id;

                    return (
                      <div
                        key={s.id}
                        onClick={() => !isEditing && onSelectSession(s.id)}
                        className={`session-item ${isActive ? 'active' : ''}`}
                        title={isEditing ? undefined : s.title}
                      >
                        {isEditing ? (
                          <div className="session-rename-form" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveRename(s.id, e as any);
                                if (e.key === 'Escape') cancelRename(e as any);
                              }}
                            />
                            <button onClick={e => saveRename(s.id, e)} className="rename-confirm" title="Save title">
                              <Check size={12} />
                            </button>
                            <button onClick={cancelRename} className="rename-cancel" title="Cancel">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="session-title" title={s.title}>
                              {s.title}
                            </span>

                            <div className="session-actions" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => startRename(s, e)}
                                className="session-action-btn"
                                title="Rename conversation"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={e => handleDelete(s.id, e)}
                                className={`session-action-btn ${isConfirming ? 'confirming-delete' : ''}`}
                                title={isConfirming ? 'Click again to confirm delete' : 'Delete conversation'}
                              >
                                {isConfirming ? (
                                  <span className="confirm-delete-badge">Delete?</span>
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar bottom: Organisation Profile */}
      <div className="sidebar-bottom">
        <div className="sidebar-user-row">
          <div className="sidebar-user-info">
            <div className="user-avatar-sm" title={dbStats?.orgTitle || 'Shadithya Hospital'}>
              {dbStats?.orgLogoUrl ? (
                <img
                  src={dbStats.orgLogoUrl}
                  alt={dbStats?.orgTitle || 'Logo'}
                  className="sidebar-org-logo-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const title = dbStats?.orgTitle || 'Shadithya Hospital';
                      const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'SH';
                      target.parentElement.innerText = initials;
                    }
                  }}
                />
              ) : (
                (dbStats?.orgTitle || 'Shadithya Hospital').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'SH'
              )}
            </div>
            <div className="user-details-sm">
              <span className="user-name-sm">{dbStats?.orgTitle || 'Shadithya Hospital'}</span>
              <span className="user-role-sm">Super Admin</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
